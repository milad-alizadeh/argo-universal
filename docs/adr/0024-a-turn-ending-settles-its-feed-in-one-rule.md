# A Turn's ending settles its Feed in one rule

Every Turn ending settles the Turn's Session updates through one Feed rule (owner, 2026-10-13). The endings are completion, cancel, cancel timeout, Agent crash and Engine restart. A Tool call still `pending` or `in_progress` when its Turn ends is settled as `cancelled`, whatever the Stop reason. Argo knows only that the Turn ended before the Agent reported a result, so `failed` stays reserved for a failure the Agent reported. The Turn's Stop reason and its Notice say why the Turn ended.

The Engine runs the rule live through Feed's revision bump. Startup recovery hydrates the unsettled rows and applies the same rule through Feed, inside its one transaction, instead of writing rows with raw SQL. This keeps ADR-0003: the database is the only record, recovery is a startup repair, and a Turn running at restart ends with the Stop reason `error`. Feed owns the ids and payloads of the Session updates a Turn's ending writes: the crash Notice, the interruption Notice, the cancel-timeout Notice and the cancelled Permission request outcome (ADR-0006).

A cancel waits 10 seconds for the Agent. After that the Turn ends `cancelled` with the cancel-timeout Notice. Then the Session closes its own ACP session through the owned close (ADR-0003) and reopens it with `session/resume`. The shared Agent process is never restarted for one Session (ADR-0015). Updates that arrive for a settled Turn are dropped and counted, so a settled Tool call never changes again.

## Considered Options

- `failed` for every unfinished Tool call, as restart recovery wrote before. Rejected: it claims a failure the Agent never reported, and the App could not tell the two apart.
- `cancelled` or `failed` chosen by Stop reason. Rejected: an `error` Turn still does not know how its unfinished Tool calls ended.
- The App treating a settled row as not running. Rejected: two checks that can disagree; the Engine makes `status` truthful instead.
- On cancel timeout, abandoning the Turn and keeping the lease, or restarting the shared Agent process. Rejected: the first lets a busy Agent take the next prompt, and the second interrupts every other Session on that Agent.
