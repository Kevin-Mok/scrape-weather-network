# Weather trial continuation

Recover the current evidence and continue the next scheduled observation. Preserve the distinction between a verified cache workaround and an unresolved first extraction failure.

## Goal and Done Criteria
Goal: obtain reliable permitted hourly extraction and preserve enough sanitized evidence to select a supported repair or alternative.
- DC1: Verify cached-redirect workaround and controller choice.
- DC2: Preserve a postmortem per failure/interruption.
- DC3: Discriminate future extraction failures safely.
- DC4: Meet unattended48/48 acceptance and observe DST separately.
- DC5: Restore user-requested validated publication and verify deployed agreement; keep reliability acceptance separate.

## Constraints
Work in `/home/kevin/coding/scrape-weather/.worktrees/playwright-diagnostics` on `feat/playwright-diagnostics`. Publishing units now reference this repaired worktree at the user’s subsequent request; original unit backup is in ignored data/units-before-activation. All existing failures, reports and unrelated dirty work protected. No reset, URL workaround, sandbox relaxation or validation weakening.

## Decisions
Keep native agent-browser because both repaired controllers passed3/3. Cache configuration uses Playwright CDP. Continue the failed cohort for evidence; it cannot be accepted automatically. Synthetic early-window rollover explains a possible before/after-hour difference but does not identify attempt01's cause.

## Current State
Updated2026-10-29T22:31Z. Trial3 attempts:2passed,1failed,0pending, accepted=false; timer active, next19:00EDT. Resumed diagnostics verified by one independent live nonpublishing extraction (not a cohort attempt). Session delivery milestone: `fix: restore sandboxed weather publishing` on feat/playwright-diagnostics; commit/push workflow verifies the candidate and leaves reliability criteria unchanged. No web-app redeployment is needed. Publishing service18:25EDT succeeded; Blob/API/browser show a fresh validated TWN feed.

## Evidence and Failed Attempts
- DC1 — met — original/repaired pairs → both original controllers loop; both repaired pass72records3/3 → [plan](../playwright-diagnostics.md).
- DC2 — met — failure/interruption fixtures and first saved report → immutable per-attempt summaries present → [attempt01](../../docs/postmortem/2026-10-29-trial-attempt-01.md).
- DC3 — met — RED/GREEN boundary/privacy/integration fixtures and live diagnostic →49tests pass,1skip; local browser separately1/1; live72rows with allowed UTC pair/counts/gen → `data/diagnostics/resumed-extraction.json`.
- DC4 — failed — scheduled cohort →1failure of3attempts; no24-hour/DST acceptance → `data/trial/runs.json`; retain upcoming results.
- DC5 — met for requested operational restoration — actual service/Blob/API/browser → successful publishing run,72Blob rows and12matching deployed rows, no fallback → data/diagnostics/production-restored.json; reliability DC4 remains failed.
- Failure: extraction-after-successful-navigation — Attempts:1 — Last evidence: `data/trial/postmortem-01.md` — Changed since: stage/coverage/count/first-difference diagnostics — Retry when: next ordinary calendar execution; no duplicate manual cohort retry.

## Artifacts
- [task.md](task.md): fixed criteria and protected state.
- [checks.md](checks.md): independent review.
- [GPT Online prompt](../../prompts/weather-browser-investigation.md): hypotheses, evidence and alternatives request.
- [living report](../../docs/postmortem/2026-10-29-browser-comparison.md): lookup, failures and supported conclusions.

## Blockers
First source/error missing prevents confirmation of original extraction cause. Future scheduled observations are time-dependent. Current cohort cannot meet48/48; no automatic promotion.

## Ordered Next Actions
1. Owner: resumed agent — Action: run `node scripts/trial.mjs --status` in the scraper worktree after the19:00EDT execution — Expected: next result preserved and each new failed attempt has a postmortem — Stop if: state is malformed; preserve it and investigate.
2. Owner: resumed agent — Action: inspect `data/trial/run-04.json` and, if present, `data/trial/postmortem-04.md` — Expected: safe stage/window/count evidence distinguishes failures — Stop if: original data is unavailable; keep the conclusion explicitly unknown.
3. Owner: resumed agent — Action: reconcile new report hashes in `/home/kevin/linux-config/dot_agents/skills/postmortem-memory/sources.json` and update this progress document — Expected: targeted checks pass; current results and next discriminating action recorded — Stop if: source evidence cannot support a remedy.

Publishing CLI now uses the shared sanitized report writer and an atomic publication-pending.json marker. Failure postmortems live under data/failures; next invocation recovers interrupted predecessors conservatively with possible publication status. Original condition history and old feed were preserved; raw tokens never enter saved diagnostics. No separate cron is installed.

Automatic production calendar18:30run succeeded in15seconds; deployed API reflects fetchedAt22:30:11.620Z, TWN source and no fallback. Current public site is operational; sustained reliability remains unaccepted. Existing npmsetup and systemctl service commands are the reusable activation path.
