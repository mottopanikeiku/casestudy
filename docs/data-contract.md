# Data Contract

## Input Files

### `data/market_intelligence.csv`

Contains provider and account context used for ranking:

- provider id and name
- title, specialty, institution, and health-system affiliation
- estimated monthly patients
- estimated genomic-eligible patients
- current Tempus volume
- competitor volume and named competitor
- payer mix
- relationship stage
- recent publication metadata

### `data/product_knowledge_base.md`

Contains public-source Tempus product facts used for grounding:

- product names and workflows
- gene counts
- sample or specimen expectations
- turnaround framing
- differentiators
- public-source citations and URLs

### `data/crm_notes.txt`

Contains mock relationship history for 5-10 physicians and stakeholders:

- dated interactions
- rep name
- channel or note type
- free-text note
- tagged objections
- suggested next steps
- simple warm/hot/cold sentiment

## Normalized Fields

The prototype normalizes the following for downstream logic:

- `top_cancer_types` and `recent_publications` from `|`-separated text into arrays
- `est_monthly_patients`, `est_genomic_eligible`, `current_tempus_volume`, and `competitor_volume` into numbers
- CRM objections (comma-separated) into tag arrays
- CRM next steps (semicolon-separated) into ordered lists

`tempus_relationship` and CRM sentiment are used verbatim. Filters and scoring expect `new_prospect`, `lapsed`, `active`, or `champion`, and `hot`, `warm`, `neutral`, or `cold`; other values fall back to default scores.

## Trusted Evidence

Trusted evidence means:

- public Tempus web pages
- public Tempus PDFs
- Tempus news posts
- source snippets stored in the product knowledge base or source library

The generation layer should treat those facts as authoritative for this prototype.

## Synthetic Vs Public Fact

Synthetic:

- provider identities
- account volumes
- relationship stages
- competitor mix
- CRM notes
- meeting context

Public-source fact:

- Tempus product capabilities
- published gene counts
- specimen workflow details
- public turnaround framing
- public trial-network or workflow positioning

## Grounding Rule

Generated outputs may combine:

- provider-specific synthetic context
- public-source Tempus evidence

Generated outputs may not invent:

- new clinical metrics
- unsupported turnaround claims
- reimbursement guarantees
- unsupported competitor comparisons
