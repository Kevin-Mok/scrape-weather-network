# Condition catalog live verification

Track the live scrape verification failure while keeping the saved forecast and condition history safe.

## Symptom and impact
- The sandboxed command `AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/google-chrome npm run scrape -- --local` exited 1 immediately: Browser open failed; browser cleanup also failed.
- Existing forecast preserved. Unit checks passed (18/18). Live verification subsequently passed with normal host permissions.

## Evidence and lookup
- Existing repo lesson recommends installed sandbox-enabled Chrome; that executable was explicitly selected.
- Canonical lookup query: `agent-browser Browser open failed sandbox`. Applicability: browser execution environment may prevent startup; the generic error alone does not establish root cause.

## Resolution and verification
- Approved retry outside the command restriction, with the same installed sandbox-enabled Chrome, exited 0 and saved all 72 hours plus the catalog. Browser sandbox was not disabled.
- The normal source-page load timeout followed the existing exact-URL/readiness recovery and complete extraction passed.
- Workaround verified; initial environment restriction is supported by the same command succeeding outside it, but the generic first error does not prove the exact startup failure.
- No new reusable learning: existing environment escalation guidance covers the workaround. It does not establish a host sandbox repair.
- Catalog coverage checked against all non-null names in the saved forecast; automated accumulation/corruption/collision checks pass.


## Commit-session verification
- Git staging in the restricted environment failed with read-only index.lock; worktree edits remained intact. Git metadata writes require normal approved host permissions.
- Required privacy scanner invoked from its canonical installation because this repository does not contain scripts/executable_privacy-gate. Before successful staging, it flagged existing candidate home paths and commit email identity. No commit attempted; inspect exact staged candidate and repair or obtain an approved public identity before committing.
- Privacy repair: replace host-specific home prefixes with `~/` and represent the same public app repository with HTTPS in README and three related historical documents. Their historical meaning is preserved; old Git history is unchanged.
- The existing Git author/committer identity is already explicitly approved by the canonical private privacy policy; reuse that policy without changing it or Git identity.
- Resolution: approved staging succeeded; canonical privacy check with the existing private identity policy passed after the documentation repairs. Full tests remain 18/18; no Git hooks bypassed.

## Public repository preflight
- Restricted GitHub read failed to connect to api.github.com; approved host-network lookup succeeded. Same established environment workaround, no new reusable finding.
- Intentional history audit flagged original local home paths and generic email heuristics. Existing private policy explicitly approves the current Git identity. Publish the clean current tree on a new independent main branch while preserving original local commits; do not upload historical home paths or force-push.
