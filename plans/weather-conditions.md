# Accumulate observed weather conditions

Keep a persistent list of condition names from successful forecast updates so image selection can cover every observed type.

## Scope and decisions
- Store a sorted JSON array at `weather-conditions.json` beside the configured forecast output (default `data/`). Preserve exact source names, skip nulls, deduplicate across runs.
- Reuse the publication path for both local and scheduled updates; leave the public feed contract unchanged.
- Validate existing history and fail without replacing it if malformed. Use atomic replacement. No image generation in this task.
- Generated data remains ignored; do not delete the catalog during normal forecast cleanup.

## Steps
- [x] Observe defining accumulation and corruption tests RED.
- [x] Add persistent catalog and CLI output.
- [x] Update README/smoke checks; run full suite and exercise saved data.

## Risks and verification
- The catalog covers observed conditions, not every possible source label; deleting local data loses history.
- Publication and local files cannot form a distributed transaction. Validate history before publishing; atomically save catalog before replacing forecast after successful publication.
- Concurrent manual runs are not supported; systemd serializes scheduled runs.
- Initial implementation verification: tests observed RED (missing catalog and missing rejections), then `npm test` passed all three files; expanded runner passed 18/18 cases. Live local CLI saved 72 hours and initialized the catalog; direct coverage check passed. CLI help documents automatic accumulation. No configuration changes.
- Review: independent reviewer found overlapping manual runs can lose additions. Ruling: preserve the existing single-run operational model; scheduled service serializes runs, README explicitly warns against manual overlap. Locking/stale-lock recovery is outside this small change.
- Rollback: revert source changes; retain the catalog as a backup. No public feed schema change or app deployment needed.
- Manual checks: local scrape plus catalog inspection verified. Existing scheduled service invokes the same CLI; no service installation change needed.
- Suggested commit: `feat: accumulate observed weather conditions`.
- Postmortem: restricted browser verification failed, approved host retry succeeded; report in docs/postmortem/2026-10-20-condition-catalog-verification.md.

## Final handoff evidence
- Live catalog initialized with six names: A mix of sun and clouds, Clear, Mainly clear, Mainly sunny, Partly cloudy, Sunny.
- Final verification after formatting: npm test exit 0 (three files), expanded runner 18/18; git diff --check exit 0.
- Canonical postmortem ledger appended with no-new-learning decision, preserving pre-existing edits; targeted check exit 0, no errors or missing aliases.
- Scheduled publication was covered by injected-publication integration checks; an additional installed-service run was not performed in this task.
- README and docs/smoke-tests.md document catalog retention and manual checks. Initial implementation handoff preceded the commit-session request.

## Commit milestone: feat: accumulate observed weather conditions
- Authorized session-only commit on `feat/scarborough-hourly`; no remote or upstream is configured, so delivery remains local.
- Scope helper could not detect tool-mediated writes. Direct-write fallback uses the observed clean initial status and seven explicitly edited files: source (publication and CLI), tests, README, smoke checks, this plan and the verification postmortem.
- README recruiter gate: pass_no_change after review against the contract; setup, command flags, storage, recovery, stack rationale and opening hook match repository behavior.
- Pre-commit verification: full test suite, expanded individual cases, staged diff and canonical privacy gate. Results reported with the resulting hash; no app deployment required.
- Generated data excluded. Separate linux-config checkout and its baseline-dirty ledger remain untouched by this repository commit workflow.
- Completed: persistent catalog, regression coverage, live initialization and documentation. Remaining blocker: a push destination must be configured before this repository can be pushed.

## Commit preflight follow-up
- Staging requires approved host permissions because the restricted environment mounts Git metadata read-only.
- Whole-candidate privacy scan found baseline home paths and SSH notation. Safely sanitize README plus three related existing docs (handoff, original plan and original postmortem); include these observed companion repairs in session scope.
- Use the canonical privacy scanner with the existing private policy that already approves this Git identity; no policy or identity change.
- Pre-commit results: npm test exit 0 (3 files), expanded runner 18/18; staged whitespace check passed; canonical privacy scanner passed with the existing approved identity policy.

## Public repository milestone: feat: publish weather scraper
- User requested a new public GitHub repository: Kevin-Mok/scrape-weather.
- README recruiter review remains pass_no_change; the current snapshot already documents installation, operating commands, condition retention and recovery.
- History audit found host paths in the original local commit. Publish the reviewed current files as a new root commit on `main`; preserve `feat/scarborough-hourly` and both existing local commits unchanged and unpushed. This creates a separate publication branch without rewriting history.
- Exact immutable-tree privacy gate must pass using the already approved private identity policy before commit-tree. Push only main, configure origin/main upstream and verify public visibility and remote SHA.
- Prior implementation tests: 18/18 and live 72-hour extraction. This milestone changes publication metadata/documentation only; no source behavior change or Vercel deployment.
- Network access required approved host execution; initial restricted GitHub read could not reach api.github.com. Host GitHub lookup succeeded.
