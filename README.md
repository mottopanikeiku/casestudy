# Tempus Sales Copilot

This is a browser prototype for oncology sales account preparation, using synthetic account data and cited public Tempus product information.

## Question

Can a small account-preparation workspace explain who to prioritize and turn mock CRM notes into editable meeting drafts without requiring a model API?

## What I built

[`index.html`](index.html) contains the interface, deterministic ranking engine, CSV/CRM parsers, and local draft templates. It loads the [market dataset](data/market_intelligence.csv), [CRM notes](data/crm_notes.txt), and [product reference notes](data/product_knowledge_base.md), with embedded copies available as fallbacks. [`docs/scoring-rubric.md`](docs/scoring-rubric.md) explains the ranking factors; [`prompts/system.md`](prompts/system.md) defines the optional model's role and constraints.

## Result

The prototype ranks [10 synthetic accounts](data/market_intelligence.csv) and provides account briefs, objection responses, meeting scripts, and a weekly plan in its free Demo Mode. Ranking uses structured account fields and CRM sentiment, not an LLM. Demo drafts are templates, not model outputs; the score is a hand-written prioritization heuristic, not a measured probability of adoption.

There is no measured sales benefit, clinical validation, or comparison with a real representative's prioritization. Product statements are working notes linked to public sources, not independently verified medical guidance.

## Run locally

From the repository root:

```sh
nice -n 19 python3 -m http.server 8080
```

Open `http://localhost:8080` in a browser. Stay in **Demo Mode** to use the ranking and drafts without credentials or paid compute. A CPU-only laptop with Python 3 and a modern browser is sufficient; no GPU or model download is needed. Serving the demo has no paid-service cost. Fonts and branding load from public websites.

The optional Claude connection is not needed to reproduce the demo and can incur API charges. [`api/claude.js`](api/claude.js) reads a server-side `ANTHROPIC_API_KEY`; local manual key entry is also supported. Neither path is part of the free reproduction instructions.

## Limitations

- Provider identities, publications, volumes, relationships, and CRM interactions are synthetic; real institution names provide setting only. Do not use these records for outreach.
- The ranking weights and account-fit rules are assumptions, not learned or validated against sales outcomes. Recency depends on the current date.
- Source links and product claims can become stale; review the original materials before using a draft.
- Prompt rules and the [output checklist](evals/output-checklist.md) are instructions for review, not proof that generated text is accurate or safe.
- This case-study prototype has no CRM integration, access control, or patient-data workflow. Do not upload confidential data or use drafts as treatment recommendations.

## Prior work and sources

Tempus product information and branding come from public Tempus materials, including [genomic profiling](https://www.tempus.com/oncology/genomic-profiling/) and the [media kit](https://www.tempus.com/resources/media-kit/). This is an unofficial concept prototype, not a Tempus product. The [product notes](data/product_knowledge_base.md) link individual sources; [workflow and data assumptions](docs/problem-framing.md), [data provenance](docs/data-contract.md), and the [prompt assets](ai/README.md) document the rest of the design.

Written with AI coding assistance.
