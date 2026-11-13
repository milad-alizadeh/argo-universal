# A Plugin supplies PR-backed Changes through a Changes Slot

This amends [ADR-0037](0037-plugins-declare-the-data-they-need.md) and builds on [ADR-0035](0035-plugins-add-to-named-slots-and-never-edit-core-screens.md), [ADR-0036](0036-plugins-own-sign-in-and-argo-brokers-their-accounts.md) and [ADR-0039](0039-the-workbench-summarises-sections-and-the-inspector-shows-them-in-full.md) (owner, 2026-11-13, #2025, spec #2024). ADR-0037 said the Session Slot context carries no PR or check and that `SessionInfo.pullRequest` stays null, so core models neither. That line held while nothing supplied pull requests. The Workbench and Inspector already draw several Changes, and a Session can produce several PRs over time, so the data now needs a typed way in that keeps GitHub out of core.

## Decision

- **A versioned add-only items Slot, `argo/session/changes/v1`,** takes a Session's Changes from Plugins. Its context is `{ sessionId, projectId }`, ids only, like the Session row, and one batched call is keyed by Session id. Core draws the Changes in its own Changes card and Inspector; a Plugin never gets a card, a layout or a style. Items from every Plugin show (a limit of 100 per Plugin), because the card previews three itself (ADR-0039).
- **`Change` is a shared Contract.** `{ id, stage, title, provider?, repository?, branch?, base?, head?, pullRequest?: { number, url }, draft?, conflict?, totals? }`. Working and Branch Changes need no number, repository or provider. A PR-backed Change always has a repository: **a PR is identified by repository plus number, never by number alone**, and `id` is stable and unique within its Plugin, such as `github:owner/name#12`. Draft and conflict are separate facts, so both can hold at once. Every field after `title` is optional and the item is strict, so Checks (#2028) and files (#2029) arrive as new optional fields without breaking a Plugin that already answers.
- **Core keeps no PR model.** `SessionInfo.pullRequest` stays null. The App reads the Slot and draws PR-backed Changes from it; Working and Branch Changes still come from the Checkout, so a line of work is never counted twice. Matching a local Change with its PR is explicit, by repository and branch, never by title (a later increment).
- **A first-party GitHub Plugin (`plugins/github`) owns GitHub.** It builds the requests, parses the replies and keeps the **PR association** (Session to repository plus number) in its own storage, in one table keyed `(project_id, session_id, repository, number)`. Attaching twice is the same row. A later increment adds columns, such as where an association came from, and a row per Change, without rewriting these. The repository is stored as GitHub reports it for the pull request, in lower case.
- **Associations are written by Operations only.** `github.attach` (`act`, caller Project and Session) refuses a Session outside the caller's Project, a reference it cannot parse and a PR GitHub does not show to the Project's Account, then stores the row. `github.list` (`read`) returns the Session's PRs with GitHub's data, or the reason one could not be read. Loaders and Queries only read. No Operation changes a PR on GitHub.
- **GitHub reads borrow the Project's Account** through the broker (ADR-0036) as a named Query shared by the Slot and the Operations. The Plugin declares `fetch` for `api.github.com` and `sessions:read` and holds no token. It also offers sign-in for that host, as ADR-0036 allows two providers; a Project uses whichever Account it chose.
- **A failed read is not an empty answer.** A read that fails makes the Slot provider throw, so Argo leaves that Plugin's Changes out, logs why and keeps local Changes. `github.list` names each PR it could not read. Showing that failure in the App needs a design that does not exist yet (see Not decided).

## Reconciling #1300

Spec #1300 proposed a core Change module with a Forge port and a `gh` adapter, plus automated Reviews. Spec #2024 chose a different boundary for the first increment: the GitHub Plugin supplies PR data and core only draws it. This ADR is that boundary, so the ownership and production GitHub transport parts of #1300 point here: core has no GitHub client and no `gh pr` integration. The Review proposals in #1300 stay future work, and this change does not close it.

## Considered options

- **A separate Pull Requests card or a Plugin-drawn Workbench card.** Rejected: it duplicates the Changes card and gives a Plugin control of core layout, against ADR-0035.
- **A core GitHub client and a Forge port (#1300).** Rejected for now: it puts one vendor's transport in core and designs a port before a second vendor exists.
- **A tree Slot for the Changes.** Rejected: ADR-0046 already removed tree Slots in favour of data Argo draws.
- **Putting pull requests into the Issue tracker Plugin.** Rejected: ADR-0036 makes a code host and an Issue tracker separate Plugins.
- **Storing only a PR number.** Rejected: two repositories share numbers, and a fork PR belongs to its target repository.

## Not decided here

- A refresh clock. A Slot answer is kept until the Plugin says `argo.changed()` or one of its Operations runs, so an attached PR does not update by itself yet. #2028 adds a visibility-bound refresh.
- Multiple Changes, detach, discovery (#2026, #2027), Checks (#2028) and PR files (#2029).
- A visible state for a failed or sign-in-needed read, which needs a Paper design before code.
