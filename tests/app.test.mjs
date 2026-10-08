import assert from "node:assert/strict";
import { test } from "node:test";
import { loadApp, readRepoFile } from "./load-app.mjs";

const app = loadApp();
const marketText = readRepoFile("data/market_intelligence.csv");
const crmText = readRepoFile("data/crm_notes.txt");
const kbText = readRepoFile("data/product_knowledge_base.md");

test("parseCsvLine handles quoted commas and escaped quotes", () => {
  assert.deepEqual([...app.parseCsvLine('"a, b","say ""hi""",3,')], ["a, b", 'say "hi"', "3", ""]);
});

test("market CSV parses into typed provider rows", () => {
  const market = app.parseMarketIntelligenceCsv(marketText);
  assert.equal(market.length, 10);
  const chen = market.find(provider => provider.id === "P001");
  assert.equal(chen.est_genomic_eligible, 60);
  assert.equal(chen.current_tempus_volume, 5);
  assert.deepEqual([...chen.top_cancer_types], ["NSCLC", "Small Cell Lung Cancer", "Mesothelioma"]);
  assert.equal(chen.notes_flag, true);
  const kim = market.find(provider => provider.id === "P008");
  assert.deepEqual([...kim.recent_publications], []);
});

test("CRM notes parse into dated interactions with tags and next steps", () => {
  const crm = app.parseCrmNotesText(crmText);
  assert.equal(crm.length, 10);
  assert.equal(crm.reduce((sum, note) => sum + note.interactions.length, 0), 25);
  const chen = crm.find(note => note.provider_id === "P001");
  assert.equal(chen.provider_name, "Dr. Sarah Chen");
  const first = chen.interactions[0];
  assert.equal(first.date, "2025-11-15");
  assert.equal(first.sentiment, "warm");
  assert.deepEqual([...first.objections], ["competitor_loyalty", "needs_comparison_data"]);
  assert.deepEqual([...first.next_steps], ["Send xF vs Guardant comparison", "Schedule TIME trial demo"]);
  assert.match(first.note, /^Met at ASTRO\./);
});

test("CRM notes with Windows line endings parse the same as LF", () => {
  const crlf = crmText.replace(/\r?\n/g, "\r\n");
  assert.deepEqual(app.parseCrmNotesText(crlf), app.parseCrmNotesText(crmText));
  const market = app.parseMarketIntelligenceCsv(marketText);
  const validation = app.validateCrmInput(crlf, app.parseCrmNotesText(crlf), new Set(market.map(provider => provider.id)));
  assert.deepEqual([...validation.malformedBlockIds], []);
  assert.equal(validation.providerCount, 10);
});

test("committed data files pass the in-app validators", () => {
  const market = app.parseMarketIntelligenceCsv(marketText);
  const crm = app.parseCrmNotesText(crmText);
  const health = app.buildLocalDataHealth({
    marketValidation: app.validateMarketInput(marketText, market),
    crmValidation: app.validateCrmInput(crmText, crm, new Set(market.map(provider => provider.id))),
    kbValidation: app.validateProductKnowledgeMarkdown(kbText)
  });
  assert.equal(health.level, "ok", health.detail);
});

test("validators flag broken inputs", () => {
  const noTitle = marketText.replace('"Director, Thoracic Oncology Program"', '""');
  const noTitleValidation = app.validateMarketInput(noTitle, app.parseMarketIntelligenceCsv(noTitle));
  assert.deepEqual([...noTitleValidation.presentationIssueIds], ["P001"]);

  const implausible = marketText.replace(",72,55,30,10,", ",72,55,80,10,");
  const implausibleValidation = app.validateMarketInput(implausible, app.parseMarketIntelligenceCsv(implausible));
  assert.deepEqual([...implausibleValidation.plausibilityIssueIds], ["P003"]);

  const outOfOrder = crmText.replace("2026-01-22 | email", "2025-01-22 | email");
  const crmValidation = app.validateCrmInput(outOfOrder, app.parseCrmNotesText(outOfOrder), new Set(["P001"]));
  assert.deepEqual([...crmValidation.outOfOrderIds], ["P001"]);
  assert.equal(crmValidation.missingCrmIds.length, 9);

  const kbValidation = app.validateProductKnowledgeMarkdown(kbText.replace("## xR", "## RNA"));
  assert.deepEqual([...kbValidation.missingSections], ["## xR"]);
});

test("prompt files loaded by the app contain their required tokens", () => {
  for (const [key, path] of Object.entries(app.AI_ASSET_FILES)) {
    const text = readRepoFile(path).trim();
    assert.ok(text, `${path} is empty`);
    const missing = app.getMissingPromptTokens(text, app.AI_PROMPT_TOKEN_REQUIREMENTS[key] || []);
    assert.deepEqual([...missing], [], `${path} is missing tokens`);
  }
});

test("embedded prompt fallbacks contain their required tokens", () => {
  for (const [key, tokens] of Object.entries(app.AI_PROMPT_TOKEN_REQUIREMENTS)) {
    assert.deepEqual([...app.getMissingPromptTokens(app.DEFAULT_AI_ASSETS[key], tokens)], [], key);
  }
});

test("score weights sum to one and scores stay within 0-100", () => {
  const total = app.SCORE_COMPONENTS.reduce((sum, component) => sum + component.weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  app.setMarket(app.parseMarketIntelligenceCsv(marketText));
  app.setCrm(app.parseCrmNotesText(crmText));
  const ranked = app.computePriorityScores();
  assert.equal(ranked.length, 10);
  for (const provider of ranked) {
    assert.ok(provider.score >= 0 && provider.score <= 100, `${provider.id} score ${provider.score}`);
    for (const component of app.SCORE_COMPONENTS) {
      const value = provider.components[component.key];
      assert.ok(value >= 0 && value <= 1, `${provider.id} ${component.key} ${value}`);
    }
  }
  for (let index = 1; index < ranked.length; index++) {
    assert.ok(ranked[index - 1].score >= ranked[index].score, "ranking is sorted by score");
  }
});

test("ranking is reproducible from the data as-of date", () => {
  assert.equal(app.getDaysSince(app.CONFIG.asOfDate), 0);
  assert.equal(app.getDaysSince("2026-03-15"), 7);
  app.setMarket(app.parseMarketIntelligenceCsv(marketText));
  app.setCrm(app.parseCrmNotesText(crmText));
  const ranking = [...app.computePriorityScores()].map(provider => `${provider.id}:${provider.score}`);
  assert.deepEqual(ranking, [
    "P006:88", "P001:79", "P016:72", "P025:70", "P011:68",
    "P015:65", "P014:63", "P003:62", "P008:61", "P009:59"
  ]);
});

test("local week plan visits each top provider exactly once", () => {
  app.setMarket(app.parseMarketIntelligenceCsv(marketText));
  app.setCrm(app.parseCrmNotesText(crmText));
  const ranked = app.computePriorityScores();
  app.setRanked(ranked);
  const plan = app.buildWeekPlanLocal();
  for (const provider of [...ranked].slice(0, 7)) {
    const visits = plan.split(`**${provider.name}**`).length - 1;
    assert.equal(visits, 1, `${provider.name} appears ${visits} times:\n${plan}`);
  }
  for (const provider of [...ranked].slice(7)) {
    assert.ok(!plan.includes(provider.name), `${provider.name} is outside the top 7`);
  }
});
