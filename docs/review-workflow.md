# Review Workflow for Automated Collections

## Monthly collection PR checklist

- [ ] Confirm the PR summary shows the session date, route set, and methodology version.
- [ ] Verify methodology consistency:
  - Check if this run introduced a new `collection-routes.json` definition.
  - Confirm no hidden shift from automated to manual interpretation in the same trend segment.
  - Verify the "Methodology break" flag in the session summary output.
- [ ] Confirm route-aware review scope:
  - For route-limited analysis, only compare with the same route across automated sessions.
  - For `all routes`, ensure top-level values are used as intended.
- [ ] Sensitive-content gates:
  - `npm run test:release-contract`
  - `npm run test:source-safety`
  - `npm run test:safety`
  - Confirm the edition is `private-business`.
  - No forbidden path/pattern leakage in changed source or sessions.
- [ ] Structural gates:
  - `npm run test:collection-config`
  - `npm run test:sessions`
  - `npm run test:allowlist`
  - `npm run test`
- [ ] Threshold review:
  - Verify latest automated status card values for `LCP/FCP/TTFB/CLS/TBT/JS KB/DOM Nodes/Requests/3P failures`.
  - Explicitly call out any new FAIL or meaningful regression in the release notes and recommendations.
- [ ] Uptime monitor operations review:
  - Confirm the PR summary includes uptime monitor JSONL status or explicitly says it was unavailable.
  - Run `npm run monitor:notify-summary -- <monitor-jsonl-log>` when an external monitor log is available.
  - Run `npm run test:uptime-cron` before installing or changing the production cron entry.

## Release notes guidance for data-only changes

When only `src/_data/sessions/` and/or `CHANGELOG.md` changes:

1. Keep `src/` and `_data/` scope limited to data updates unless route/config/schema changes are intentional.
2. State methodology version and route set in PR body/title.
3. Call out all threshold regressions and the business impact interpretation.
4. Keep reviewer-visible evidence in one place (`/trends.html` + generated collection summary + PR body).
5. If methodology changed, avoid direct trend deltas until the new baseline is clearly marked.
6. If monitor delivery failed, include the failure code and owner action in the release notes.
