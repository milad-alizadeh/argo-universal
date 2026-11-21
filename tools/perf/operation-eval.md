# Live eval of Operation discovery

`perf:operations` measures how fast real Agents find and run Argo Operations, the path a Voice call's request takes too.
It starts real Agent Sessions only with `--real-agent`, so it spends Agent quota.

## What it does

For each Agent, run and task, it:

1. Starts an idle Session on the Project's main Checkout, with the Agent's own defaults, through Argo's Operations and the person's control token.
2. Subscribes to that Session's Feed, as the runtime harness does ([runtime.md](runtime.md)).
3. Sends the task as the first Prompt and waits for its Turn, up to `--timeout-ms`. A Turn that waits on the person, or passes the deadline, is cancelled.
4. Reads the Tool call rows on one `performance.now` clock. Argo records each Operation an Agent runs as a row of its own (`argo:` ids), whichever Agent ran it, so nothing is Agent-specific.

The tasks are in `operation-eval-tasks.mts`. Each names what a person would ask and the Operation that answers it. `voice-start-session` sends what a Voice call's relay sends: the Voice instruction, then the request.

## What it reports

Per Agent and task, over the runs that reached the expected Operation:

- **Ran it**: runs whose Agent ran the expected Operation.
- **To Operation**: seconds from sending the Prompt to Argo recording the Operation, median and 90th percentile.
- **Agent calls**: the Agent's own Tool calls up to and including the one that ran it.
- **Searches**: `operation_list` calls before it.
- **Tool loads**: tool searches to load deferred tools, such as Claude Code's `ToolSearch`.
- **Turn**: the whole Turn's median length.

`runs.jsonl` keeps every run with its Session id, so a run can be opened in the App and read.

## Run it

Use a disposable Project: every unarchived Session in it is archived at the end unless `--keep`.

```sh
pnpm --filter @repo/tools perf:operations --real-agent \
  --agents claude-acp,codex-acp --runs 3 --project-name argo-eval \
  --output /tmp/argo-operation-eval
```

`--project ID` reuses a Project. Agents run in parallel; one Agent's runs go one after another. Run nothing heavy, such as `pnpm verify`, beside it, since the timings are wall-clock.

The eval measures the Server it reaches. To measure a change, run the same command against a Server built from the branch, and compare the two `report.md` files.
