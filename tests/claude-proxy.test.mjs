import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, test } from "node:test";

const require = createRequire(import.meta.url);
const handler = require("../api/claude.js");
const realFetch = globalThis.fetch;

function fakeResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    json(payload) { this.body = payload; return this; },
    send(payload) { this.body = payload; return this; },
    end() { return this; }
  };
}

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.ANTHROPIC_API_KEY;
});

test("GET reports demo mode when no server key is configured", async () => {
  const res = fakeResponse();
  await handler({ method: "GET" }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.mode, "demo");
});

test("POST without a server key returns 503 and never calls upstream", async () => {
  globalThis.fetch = () => assert.fail("fetch should not be called");
  const res = fakeResponse();
  await handler({ method: "POST", body: {} }, res);
  assert.equal(res.statusCode, 503);
});

test("unsupported methods return 405", async () => {
  const res = fakeResponse();
  await handler({ method: "DELETE" }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "GET, POST, OPTIONS");
});

test("POST pins the model, API version, and token cap on the server", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  let upstream;
  globalThis.fetch = async (url, init) => {
    upstream = { url, init, payload: JSON.parse(init.body) };
    return new Response("upstream error", { status: 400, headers: { "content-type": "text/plain" } });
  };
  const res = fakeResponse();
  await handler({
    method: "POST",
    body: JSON.stringify({
      model: "some-expensive-model",
      anthropic_version: "1999-01-01",
      max_tokens: 100000,
      temperature: 7,
      system: "sys",
      messages: [{ role: "user", content: "hi" }]
    })
  }, res);

  assert.equal(upstream.url, "https://api.anthropic.com/v1/messages");
  assert.equal(upstream.init.headers["x-api-key"], "test-key");
  assert.equal(upstream.init.headers["anthropic-version"], "2023-06-01");
  assert.notEqual(upstream.payload.model, "some-expensive-model");
  assert.equal(upstream.payload.max_tokens, 1024);
  assert.equal(upstream.payload.temperature, 1);
  assert.equal(upstream.payload.stream, true);
  assert.deepEqual(upstream.payload.messages, [{ role: "user", content: "hi" }]);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body, "upstream error");
});
