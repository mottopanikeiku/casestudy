const { Readable } = require("node:stream");

// The model, API version, and token cap are fixed on the server so a caller
// cannot spend the server key on a different model or an unbounded response.
const DEFAULT_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";
const DEFAULT_API_VERSION = "2023-06-01";
const MAX_TOKENS = 1024;

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function getStatusPayload() {
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  return {
    ok: hasKey,
    mode: hasKey ? "proxy" : "demo",
    provider: "anthropic",
    model: DEFAULT_MODEL,
    error: hasKey ? undefined : "ANTHROPIC_API_KEY is not configured on the server."
  };
}

function normalizeBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return req.body;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    res.status(200).json(getStatusPayload());
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ ok: false, error: "ANTHROPIC_API_KEY is not configured on the server." });
    return;
  }

  try {
    const body = normalizeBody(req);
    const upstreamPayload = {
      model: DEFAULT_MODEL,
      max_tokens: Math.round(clampNumber(body.max_tokens, 1, MAX_TOKENS, MAX_TOKENS)),
      system: String(body.system || ""),
      messages: Array.isArray(body.messages) ? body.messages : [],
      stream: true,
      temperature: typeof body.temperature === "number" ? clampNumber(body.temperature, 0, 1, 0.5) : 0.5
    };

    const upstreamResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": DEFAULT_API_VERSION
      },
      body: JSON.stringify(upstreamPayload)
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      res
        .status(upstreamResponse.status)
        .setHeader("Content-Type", upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8");
      res.send(errorText);
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", upstreamResponse.headers.get("content-type") || "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    if (!upstreamResponse.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstreamResponse.body).pipe(res);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Claude proxy failed.",
      detail: error.message
    });
  }
};
