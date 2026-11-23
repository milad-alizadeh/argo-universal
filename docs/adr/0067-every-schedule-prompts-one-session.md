---
status: accepted
---

# Every Schedule prompts one Session

Owner-approved decision, 2026-11-23 ([#2662](https://github.com/milad-alizadeh/argo-universal/issues/2662)).

Argo had two kinds of Schedule. A Project Schedule started a fresh Session for each occurrence and kept a list of those runs. A Session follow-up sent a Prompt into an existing Session once or at an interval. They had separate stores, separate timers and separate Operations. A scheduled task split across many Sessions lost the previous run's context, needed a runs list to be found, and left an archived run as a dead end.

## Decision

- **A Schedule is a cadence and a Prompt attached to one Session.** Each occurrence sends that Prompt into that Session. The cadence is once, an interval, or a calendar repeat in a time zone (daily, weekdays, weekly, custom).
- **One store and one runner.** Both ways of making a Schedule share the same table, timers, firing, missed-run rule, Run now, Pause, Edit and Delete. A flag records whether the Schedule is listed in Scheduled. The `project.schedule*` Operations and `session.schedulePrompt`, `session.listSchedules` and `session.manageSchedule` are thin wrappers over it.

  | Made from | Session | Listed in Scheduled |
  |---|---|---|
  | Scheduled, as a task | Created once, when the Schedule is saved, with the Schedule's Agent, Checkout and configuration and no first Prompt | Yes |
  | Inside a Session | That Session | No |

- **An occurrence is a Prompt from the `schedule` sender.** It goes through the Session's Prompt queue ([ADR-0054](0054-the-server-owns-the-prompt-queue.md)). An idle Session starts a Turn. A busy Session queues it and sends it when the Turn ends. If an earlier occurrence of the same Schedule is still waiting, the new one is dropped, so occurrences never pile up. An occurrence never starts another Session. Run now sends the same Prompt the same way without moving the next occurrence.
- **Missed occurrences.** A Server that returns within one hour of a due occurrence sends it late. Past that, the occurrence is skipped once and the Schedule waits for its next one; a one-time Schedule ends. The same rule holds for every Schedule.
- **Archive.** Archiving a Session pauses its Schedules. Unarchiving it offers to resume them; the person decides. Deleting a Schedule stops future occurrences and leaves its Session as an ordinary Session.
- **Edit.** The person can change a Schedule's Prompt and cadence. The Agent, Checkout and configuration belong to the Session once it exists, so a task Schedule cannot change them after it is saved. A changed Prompt applies from the next occurrence; earlier Prompts in the Feed keep what they sent.
- **History is the Feed.** Earlier runs are earlier messages in the Session's Feed. There is no runs list, run picker or history Operation; `project.scheduleHistory` and its table are removed.
- **Long-lived context.** A task Schedule's Session grows for as long as the Schedule runs. The Agent's own compaction keeps it within its context window, and the Feed pages its history. Argo builds nothing extra unless tests show a problem. Heavy runs use subagents inside the Session, not new Sessions.
- **Migration.** Each existing Project Schedule becomes a listed Schedule with the same cadence, instructions, Agent, Checkout and configuration. It adopts its latest Session when that Session still exists and is not archived; otherwise the Server creates its Session when it starts. Existing Session follow-ups become unlisted Schedules unchanged.

## Considered options

- **A fresh Session for each occurrence**, the previous Project Schedule model. Runs stay independent, but one task is split across many Sessions, needs a runs list, and an archived run is a dead end.
- **Create the task Schedule's Session at its first occurrence.** Avoids an empty Session before the first run, but leaves nothing to open from Scheduled until then and gives the store two shapes of Schedule. Rejected: the Session exists from the start.
- **Clear the Agent's context before each occurrence in the same Session.** Keeps one Feed but drops the context the owner wants kept. Still available to an Agent or the person through `session.clear`.

## Consequences

- "Project Schedule" and "Session follow-up" leave the Glossary for **Schedule**.
- A Session's Workbench shows every Schedule attached to it, wherever it was made. Selecting a task Schedule in Scheduled opens its Session.
- A Session that a Schedule prompts can also be prompted by the person between occurrences, like any Session.
