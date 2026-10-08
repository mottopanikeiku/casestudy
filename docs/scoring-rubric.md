# Scoring Rubric

Provider ranking is deterministic so a rep can audit why an account is near the top. The rules below are what `computePriorityScores()` in `index.html` does; the weights and thresholds are hand-set assumptions, not fitted to sales outcomes.

## Score

`score = round(100 × Σ weight × component)`, where every component is clamped to 0–1. Ties are broken by Why now, then Influence.

| Weight | Component | Rule |
| --- | --- | --- |
| 25% | Territory size | Genomic-eligible patients ÷ the largest value in the territory. |
| 20% | Whitespace | (eligible − current Tempus volume) ÷ eligible; 0.2 when eligible is 0. |
| 20% | Readiness | Latest CRM sentiment (hot 1.0, warm 0.76, neutral 0.5, cold 0.28, other 0.45); +0.08 if it improved since the first touch; +0.05 if the latest touch has a next step; champions get at least 0.9. With no CRM history: 0.44 for new prospects, 0.34 otherwise. |
| 15% | Influence | Pathology/lab director 1.0; title or specialty containing "medical director" or "chief" 0.94; other "director" 0.86; "surgical" 0.72; champion 0.82; everyone else 0.58. |
| 10% | Why now | Days from the latest touch to the data as-of date (`CONFIG.asOfDate`): ≤21 → 0.9, ≤45 → 0.78, ≤90 → 0.62, older → 0.42. Raised to 0.95 if the latest note or next steps mention a pilot, compliance, approval, renewal, tumor board, "referred", reflex, "next 5/10", presentation, or proposal; otherwise raised to 0.8 for demo, workflow, meeting, follow up, or trial. With no CRM history: 0.45 for new prospects, 0.32 otherwise. |
| 10% | Account fit | Starts at 0.34; +0.08 mostly commercial payer mix; +0.18 pathology/lab director; +0.12 hematologic focus; +0.14 for incumbent matchups (Foundation Medicine with thoracic, sarcoma, neuro, pediatric, or pathology; Guardant with thoracic, lung, prostate, GU, or general oncology; Caris with GI, colorectal, or pancreatic); +0.18 for Myriad with breast, ovarian, colorectal, prostate, or pancreatic focus; +0.08 if competitor volume is at least 20 per month. |

Stakeholder role enters the score only through Influence and the pathology bonus in Account fit. Readiness, Why now, and Account fit use the same rules for every role.

## Stakeholder lens

The prep brief also labels each provider with a stakeholder lens that changes the suggested focus and ask, not the score:

- **Institutional gatekeeper** (pathology or lab director): routing, pricing, turnaround, and contract timing; ask for a routing, pilot, or contract-review step.
- **Program builder** (other directors and chiefs): service-line workflow, tumor-board influence, and pilot design.
- **Referral influencer** (surgical titles): tissue capture and somatic plus germline coordination.
- **Treating oncologist** (everyone else): patient-level utility, biomarkers, and a small pilot on the next real patients.

## Explainability

Each ranked provider shows the score, a per-component breakdown (raw and weighted), a why-now line, and a next step taken from the latest CRM next step or the stakeholder lens.
