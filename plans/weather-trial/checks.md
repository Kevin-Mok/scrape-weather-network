# Continued weather trial evidence review

Review the resumed diagnostics against source, fixtures and the saved live result. Preserve the distinction between observed success, a possible original failure mechanism and unmet reliability acceptance.

| Claim | Verdict | Evidence |
| --- | --- | --- |
| Current/next-hour coverage rejection remains unchanged | Verified | src/structured.mjs; early-window fixture rejects before boundary and passes after |
| Early-window rollover is a hypothesis for attempt01 | Verified as hypothesis only | attempt02 window and fixture; attempt01 source/error absent |
| DOM evaluation/script retrieval/validation/agreement have distinct phases | Verified | src/browser.mjs; publication integration fixtures |
| New postmortem fields allow only typed timestamps/counts/known field names | Verified | scripts/trial.mjs; privacy regression; write-once wx remains |
| Actual nonpublishing diagnostic records72 valid rows and source-window evidence | Verified | data/diagnostics/resumed-extraction.json;20.605s; generation22:09Z; checked22:12:30Z |
| Production and original failed cohort are unchanged | Verified | no publication import; original2saved attempts retained |
| Original failure cause,48/48 reliability and live DST acceptance established | Unresolved/unmet | first error/body missing;1of2scheduled attempts failed |

Independent evidence-reviewer found no material safety/privacy blocker and did not run tests. Its negative assertion that this change publishes or resets the cohort was rejected by evidence; the affirmative safe conclusion appears above. Separate tests agent freshly verified47passed/1skipped, plus local browser1/1. No incorrect implementation claim remains.

## User-requested publishing restoration
Narrow independent publication review verified five code claims: sanitized write-once reports, interrupted recovery with publication uncertainty, persisted-field allowlisting, truthful partial remote-success handling and preserved prior evidence. No material blocker. Separate tests agent:49passed/1skipped, local browser1/1. Actual service activation, Blob/API all-field agreement, catalog continuity and visible dashboard source independently observed by root; saved production-restored.json and production-dashboard.txt provide runtime evidence. Reliability remains unaccepted.
