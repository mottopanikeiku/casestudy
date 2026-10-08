# Prompt Pack

These markdown files are the prompts the optional Claude connection uses. Demo Mode does not send them anywhere; it uses local draft templates in `index.html`.

At startup `index.html` fetches the files listed in `AI_ASSET_FILES`. A file that is missing, empty, or lacks one of its required `{{tokens}}` is replaced by the shorter embedded fallback in `DEFAULT_AI_ASSETS`.

| Role | File | Required tokens |
| --- | --- | --- |
| System prompt | [`prompts/system.md`](../prompts/system.md) | - |
| Grounding rules (appended to system) | [`grounding_rules.md`](grounding_rules.md) | - |
| Self-check (appended to system) | [`evals/output-checklist.md`](../evals/output-checklist.md) | - |
| Prep-brief summary | [`priority_rationale_prompt.md`](priority_rationale_prompt.md) | provider_name, provider_title, provider_institution, stakeholder_type, priority_score, why_now, next_best_action |
| Objection response | [`prompts/objection-handler.md`](../prompts/objection-handler.md) | provider_name, stakeholder_type, crm_note, objections, next_step |
| First-touch intro | [`intro_script_prompt.md`](intro_script_prompt.md) | provider_name, provider_specialty, provider_institution, why_now, research_context, competitor |
| 30-second pitch | [`prompts/meeting-script.md`](../prompts/meeting-script.md) | provider_name, provider_specialty, provider_institution, stakeholder_type, recent_crm_context, why_now, tone |
| Week plan | [`week_plan_prompt.md`](week_plan_prompt.md) | territory_name, rep_name, top_accounts |

`node --test` and `scripts/validate_ai_assets.ps1` check that each file exists and contains its tokens.
