# Browser performance suites

Three Playwright suites measure the production web export against a seeded Server.
They are frame and latency instruments: none of them asserts a speed budget.

| Suite | File | Scenarios |
| --- | --- | --- |
| Frames | `interactions.perf.mts` | `sidebar`, `sessions`, `drawer`, and the Feed scenarios (`feed`, `expand`, `paging`, `streaming`) |
| Frames | `agents.perf.mts` | `agents`, `agents-phone`, against a 200-Agent registry |
| Elapsed | `elapsed.perf.mts` | `session-open-warm`, `session-open-reload`, `feed-page-ready`, `tool-expand-ready`, `feed-wheel-ready`, `sessions-wheel-ready`, `composer-type-ready` |
| Collector | `collector.perf.mts` | The frame collector's own sensitivity checks; no product scenario |

## Run them

```sh
PERF_LABEL=qa-baseline PERF_CPU=1 PERF_RUNS=10 PERF_OUT=/tmp/argo-perf-qa \
  pnpm --filter @repo/tools perf
```

The suites hold `@repo/browser-suite-lock`, so one runs per machine.
Reserve a quiet measurement window first: a run taken under load measures the machine.

| Variable | Effect |
| --- | --- |
| `PERF_LABEL` | Names the run and its result files; default `current` |
| `PERF_CPU` | CPU slowdowns to measure at, comma separated; default `1,4` |
| `PERF_RUNS` | Measured windows per scenario; default `3` |
| `PERF_ONLY` | Scenario names to measure, comma separated; empty or unset measures all |
| `PERF_OUT` | Where the reports and screenshots go; default `$TMPDIR/argo-perf` |
| `PERF_HEADED=1` | Runs with a visible browser, as a cross-check against the headless collector |
| `PERF_TRACE=1`, `PERF_PROFILE=1` | Save one trace or CPU profile per scenario; these artefacts are large |

## Read the report

`<label>.json` holds the frame scenarios, `<label>-agents.json` the Agents suite, and `<label>-elapsed.json` the elapsed suite.

Every report carries a `run` block:

```json
{ "status": "partial", "planned": ["drawer at 1x CPU"], "measured": [], "notApplicable": [], "missing": ["drawer at 1x CPU"] }
```

`planned` is every scenario the run set out to measure, after `PERF_ONLY` and `PERF_CPU`.
Each suite declares its tests from that same list, so the plan cannot drift from the tests the run queued.
`measured` produced a result, `notApplicable` carries its own recorded reason, and `missing` produced nothing.
A run with anything in `missing` writes `"status": "partial"`, prints `INCOMPLETE RUN` with every missing scenario, and fails.

**A scenario in `missing` was not measured.** It is not a passing result, a zero, or an absent regression.

## What the numbers do not say

`p95Ms` is a frame interval, not p95 time to open, Send or finish.
`durationMs` is the sampled window, and some scenarios include their settling waits.
The steady scroll is a programmatic `scrollTop` write, so it is weak evidence about real input handling.
`longTasks` has come back `0` in stalled and clean windows alike; never read it as a quiet main thread.
Web CPU throttling is a stress condition, not a low-end phone.
`collector.perf.mts` proves the collector sees a held main thread and the compositor's partial frames; it does not make the scenarios above into a budget.
