# A Turn's ending settles its Feed in one rule

Every Turn ending settles the Turn's Session updates through one Feed rule (owner, 2026-10-13). The endings are completion, cancel, Agent crash and Engine restart. A Tool call still `pending` or `in_progress` when its Turn ends is settled as `cancelled`, whatever the Stop reason. Argo knows only that the Turn ended before the Agent reported a result, so `failed` stays reserved for a failure the Agent reported. The Turn's Stop reason and its Notice say why the Turn ended.

The Engine runs the rule live through Feed's revision bump. Startup recovery hydrates the unsettled rows and applies the same rule through Feed, inside its one transaction, instead of writing rows with raw SQL. This keeps ADR-0003: the database is the only record, recovery is a startup repair, and a Turn running at restart ends with the Stop reason `error`. Feed owns the ids and payloads of the Session updates a Turn's ending writes: the exit Notice, the interruption Notice and the cancelled Permission request outcome (ADR-0006).

Cancel sends `session/cancel`, cancels pending Permissions and Elicitations, and ends the Turn `cancelled` at once, as Zed does. The Composer accepts input. A new Send waits until the Agent answers the old prompt. Any error from that cancelled prompt counts as cancelled. There is no cancel timer or automatic reopen (owner, 2026-10-15, #717). Updates for a settled Turn are dropped, so the content of a settled Turn never changes. A row that belongs to no Turn has no ending to wait for, so it is written settled at once, and it may keep growing while the Agent streams into it. The one exception is a turnless Tool call still `pending` or `in_progress`: it is not written settled, and its own status settles it when the Agent reports how it ended. `settled` on a turnless row means no Turn ending will come for it, not that no more content will arrive (#1695).

## A Prompt settles a waiting Elicitation

Owner amendment, 2026-11-20 (#2507). A Session that waits on an Elicitation and is then sent a Prompt, typed, from another Session or from a Conversation, cancels each Elicitation it waits on, as Cancel does, and keeps its Turn: the Prompt then steers the Turn or waits in the queue as any Prompt does. Before, the Session stayed waiting until Cancel ended the whole Turn, and the Prompt had to be sent again. Cancel itself is unchanged. A waiting Permission request is not settled by a Prompt; it waits for its answer.

## Considered Options

- `failed` for every unfinished Tool call, as restart recovery wrote before. Rejected: it claims a failure the Agent never reported, and the App could not tell the two apart.
- `cancelled` or `failed` chosen by Stop reason. Rejected: an `error` Turn still does not know how its unfinished Tool calls ended.
- The App treating a settled row as not running. Rejected: two checks that can disagree; the Engine makes `status` truthful instead.
