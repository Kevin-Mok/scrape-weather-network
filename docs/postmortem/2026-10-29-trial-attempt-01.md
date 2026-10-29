# First scheduled extraction failure

Preserve the first failed unattended attempt separately from the successful cache repair so a later investigator can evaluate alternatives without assuming navigation success proves reliability.

## Observed result
- Attempt1 started2026-10-29T21:59:31.983Z under the systemd user service and failed after19,036ms.
- Browser navigation succeeded: normal exact URL, server302→302→200, no cached main-frame redirects.
- Journal reached “Extracting every expanded hourly row”; no successful source-generation/agreement message or feed save followed.
- Saved reason: BROWSER_OR_EXTRACTION_FAILURE. The original stage/error was not retained, so the exact extraction cause is unknown. Do not infer a schema change, source disagreement or controller defect.
- No publication or production configuration changed. Original private diagnostics: `data/trial/run-01.json`; generated per-attempt summary: `data/trial/postmortem-01.md`.

## Comparison and follow-up
- The next ordinary calendar attempt at22:00:01.068Z succeeded in29,335ms, validating72 structured/DOM-agreeing records generated21:58Z.
- An additional nonpublishing CLI diagnostic also succeeded. Neither success repairs or erases the first failure.
- Added safe extraction-stage and rejection-category recording for future attempts. No automatic retries or reset of measurement history.
- Trial timer briefly paused during inspection, then resumed its original00/30 schedule. The original48/48 gate is already unsatisfied. Continue collecting evidence and do not promote automatically.

## Status
Unresolved intermittent extraction failure; navigation/cache workaround independently verified. Preserve this attempt and gather future staged failures before recommending a different controller or upstream API. Live DST and sustained reliability remain unverified.

## Resumed hypothesis and diagnostic improvement
A later review notes that attempt02's21:58Z generation starts23:00Z. If that forecast had already been served at21:59Z, its first hour would correctly fail current/next-hour coverage; identical data becomes allowed at22:00Z. The missing attempt01 page prevents confirmation. A synthetic boundary fixture demonstrates this possible mechanism, without weakening rejection. Future reports now retain safe source-window/count evidence and distinguish evaluation/retrieval/validation phases. The original generic failure summary remains immutable and the cause remains unresolved.
