// Loads the inline <script> from index.html into a Node vm context so the
// parsers, validators, ranking, and draft builders can be tested without a browser.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export function readRepoFile(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const EXPORTED_NAMES = [
  "CONFIG",
  "SCORE_COMPONENTS",
  "LOCAL_INPUT_RULES",
  "AI_ASSET_FILES",
  "AI_PROMPT_TOKEN_REQUIREMENTS",
  "DEFAULT_AI_ASSETS",
  "parseCsvLine",
  "EMBEDDED_MARKET_CSV",
  "EMBEDDED_CRM_NOTES",
  "parseMarketIntelligenceCsv",
  "parseCrmNotesText",
  "getMissingPromptTokens",
  "validateMarketInput",
  "validateCrmInput",
  "validateProductKnowledgeMarkdown",
  "buildLocalDataHealth",
  "getDaysSince",
  "computePriorityScores",
  "buildWeekPlanLocal",
  "buildMeetingScriptLocal",
  "buildIntroScriptLocal",
  "renderPromptTemplate",
  "getAccountFitScore",
  "escapeHtml"
];

function storageStub() {
  const values = new Map();
  return {
    getItem: key => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

export function loadApp() {
  const html = readRepoFile("index.html");
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (!match) throw new Error("index.html has no inline <script>");
  const source = match[1].replace(/\ninit\(\);\s*$/, "\n");
  if (source === match[1]) throw new Error("index.html script no longer ends with init();");

  const noop = () => {};
  const context = vm.createContext({
    console,
    localStorage: storageStub(),
    sessionStorage: storageStub(),
    document: { addEventListener: noop, querySelector: () => null, getElementById: () => null },
    window: { addEventListener: noop, location: { hostname: "localhost", protocol: "http:" } }
  });
  const getters = EXPORTED_NAMES.map(name => `${name}: () => ${name}`).join(",\n");
  const setters = `setMarket: value => { MARKET_INTELLIGENCE = value; },
    setCrm: value => { CRM_NOTES = value; },
    setRanked: value => { rankedProviders = value; },
    getMarket: () => MARKET_INTELLIGENCE,
    getCrm: () => CRM_NOTES`;
  const api = vm.runInContext(`${source}\n;({ ${getters}, ${setters} })`, context, { filename: "index.html" });
  return Object.fromEntries(
    Object.entries(api).map(([key, fn]) => (EXPORTED_NAMES.includes(key) ? [key, fn()] : [key, fn]))
  );
}
