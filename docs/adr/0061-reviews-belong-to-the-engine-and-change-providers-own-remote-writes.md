---
status: accepted
---

# Reviews belong to the Engine, and Change providers own remote writes

Owner-approved decision for #2373 and Spec 0023 (#1300), 2026-11-18. The owner approved the full proposal and its named amendments in the Session.

The Engine owns Reviews, Findings, Scores, Argo Approval and readiness. The GitHub Plugin owns GitHub reads, pull request records and remote writes. This preserves ADR-0052's ownership boundary and replaces #1300's proposed core Forge adapter.

This decision approves the amendments listed below. UI designs and implementation remain separate work.

## Change facts and ownership

A Review identifies its Change by Project, contributing Plugin and that Plugin's stable Change id. Repository and pull request number remain the provider's remote identity. A Session's association with the Change must still exist when an action runs.

The existing `Change` contract and `argo/session/changes/v1` items remain the source of displayed facts. Working and Branch Changes still come from the Checkout. Core keeps no PR table, GitHub client or copy of the Plugin's pull request record.

The Engine adds a typed Change-provider contract beside the items Slot. This is new infrastructure, not an interface that already exists. A Plugin declares two handlers: `reviewContext` and `mergeReviewed`. The declaration and handler schemas are versioned and validated through the Plugin runtime. They are not arbitrary Operation names supplied by a Slot item.

`reviewContext` takes Project, Session and Change id. It returns the current head commit, base repository, base branch and base commit. It also returns draft, conflict, Checks, mergeability and read failures. The result identifies which head the Checks describe and whether their read is complete. The Plugin enforces Project scope and the Session's association.

GitHub's handler uses its existing `sync` and Account broker. A decision read explicitly refreshes the remote facts. A retained or stale Slot answer can draw content, but cannot establish readiness. No core code reads the GitHub Plugin's storage directly.

The Engine subscribes to existing Plugin item invalidations while an open Session has an Open Change. It holds the existing shared refresh lifecycle even without an App subscription. Head changes trigger Reviews; UI visibility does not control them. Plugin disablement or failure makes readiness unavailable and cancels work that cannot establish its Change identity.

`change.list` and `change.get` expose these shared Change facts through read Operations. They do not turn the Slot into another PR store. A provider without Review support remains visible, with an explicit unavailable reason for Review actions.

## Reviewer definitions

Reviewer files live at `.argo/reviewers/*.md` in the Change's base repository. At Review start, the Engine captures the exact base commit and reads files there. It never uses definitions from the proposed head or the current working tree.

Each file has strict YAML front matter and a Markdown prompt body. Its filename is its stable Reviewer id. Required fields are `label` and `output`, where output is `findings` or `score`. Optional fields are `agent` and `model`. A Score Reviewer also requires `minimum`, `maximum` and `direction`, with direction `higher` or `lower`. Bounds must be finite, and minimum must be less than maximum. Unknown fields fail that definition.

An omitted Agent or model uses the Change Session's choice captured at Review start. An unavailable explicit Agent or model fails that Reviewer. An invalid file creates a failed Reviewer run with its reason; other Reviewers still run. An empty directory produces `no-reviewers`, which blocks readiness. A missing individual file after discovery fails its run.

The Review stores the base and head commits, captured definitions and their content hashes. A new manual Review captures definitions again. The automatic trigger starts one Review when a Change first becomes Open, then once per new head commit. It does not repeat a Review because Checks or presentation changed.

## Reviewer Sessions and Checkouts

Each Reviewer runs as a Started Session, nested under the Change's Session. It is not an ACP subagent. Its purpose and Review identity come from the Engine, never from Agent-supplied Session parameters.

The Server creates an owned detached Checkout at the exact reviewed commit through `packages/git`. It never lends the Change Session's Checkout to a Reviewer. The base and head objects must exist in the registered Project's repository. If either object is unavailable, the Review fails with that reason. This increment adds no implicit remote fetch or GitHub credential path to core.

A detached Checkout isolates normal file edits and git commands from the Change's branch. It is not an operating-system sandbox for hostile Agent code. The Reviewer receives the base-to-head comparison and a read-only review instruction. It receives no consent authority and no ability to approve, dismiss Findings or merge through Operations.

The Engine creates at most two active Reviewer Sessions across the Server. Further runs wait and can be cancelled. These Engine-created Sessions do not consume the starter's Agent delegation slots. They cannot create further Sessions through Operations. This exception does not change ordinary Started Session limits or Prompt-chain rules.

A new head cancels the old Review and its waiting and active runs. Results carry their Review, run and head identity; late results cannot update the replacement Review. A closed or merged Change also cancels active review work.

The Server removes the detached Checkout after its Agent stops. Cleanup failure remains recorded and retries after restart. The Session transcript and result survive cleanup. An Engine restart marks interrupted runs failed; it does not report completion or restart paid Agent work silently. The person can start another Review.

## Results and Finding actions

A Reviewer's final nonempty output line is one JSON object for its declared output:

- Findings: `{"findings":[{"path":"src/example.ts","line":12,"severity":"high","body":"Explain the defect."}]}`.
- Score: `{"score":{"value":80,"reason":"Explain the score."}}`.

Paths are repository-relative and cannot traverse outside it. Lines, when present, are positive integers. Severity is `high`, `medium` or `low`; a Finding body and Score reason are nonempty. A Score is finite and within its declared inclusive bounds. Invalid output fails that Reviewer and records the reason. No prose is guessed into a result.

Each Reviewer keeps at most 50 Findings, ordered by severity and then original result order. The result records the number omitted. Omitted high Findings still block readiness; resolving retained Findings cannot hide omitted blockers. The user must run another Review with a bounded result before readiness can pass.

A Review is complete only when every declared Reviewer succeeds. Failed or cancelled runs remain visible. The App retains the latest completed result while another Review runs, but labels its commit. That older result cannot satisfy readiness for a pending replacement, a failed replacement or another head.

`finding.resolve` is act and requires a nonempty note. `finding.dismiss` is confirm for an Agent. `finding.fix` is act and sends selected open Findings as one Prompt to the owning Change Session. The Engine rejects actions on superseded Reviews or detached associations. Repeating Fix with the same request id does not submit another Prompt.

The Engine supplies a fourth Prompt sender, `review`, with Review identity and a display title. The Feed draws `From Review`. The sender applies to Reviewer instructions and Fix Prompts. Caller JSON cannot claim this sender or a user sender.

## Approval and readiness

Argo Approval means a person's approval of one Change head commit. It is separate from a GitHub review or GitHub Auto-merge. Approval and withdrawal use person-only consent procedures, not Operations. Agent callers cannot reach them through a consent flag or a nested call.

A new observed head invalidates Approval. Every approval request names the head the person saw; the Server refreshes facts and refuses a mismatch. Stored Approval also identifies the authenticated person and time.

Readiness returns all missing requirements in this order:

| Requirement | Passing condition | Refusal cases |
| --- | --- | --- |
| Checks | A complete, fresh read for the current head contains at least one Check, and all pass. | Missing, empty, stale, partial, running or failed Checks. |
| Review | The latest attempted Review for this head completes successfully, with no open high Finding or omitted high Finding. | No Reviewers, no Review, pending, failed, cancelled, superseded or wrong-head Review. |
| Approval | A person approved this head. | No Approval, withdrawn Approval or another head. |
| Mergeability | A fresh provider read reports Open, non-draft and mergeable, without conflict. | Unknown, unavailable, Closed, Merged, draft or conflict. |

An empty Checks list remains distinct from a failed read. Neither passes this initial policy. There is no implicit waiver and no Score threshold. Scores inform the person; high Findings control the Review gate. Resolved or dismissed Findings do not block it.

The Review module computes readiness once for the App, Operations and merge. It persists Review data and consent, not a second remote Change record. A Review result never overrides a newer provider failure.

## Explicit merge and Auto-merge

`change.merge` is confirm for an Agent. An App tap already expresses the person's intent under ADR-0044. The request names the Change, expected head and the Review the person saw. A lock keyed by Project, Plugin and Change id serializes Review actions, consent changes and merge attempts across Sessions.

The Engine refreshes the provider context and recomputes every gate. It then calls the provider's internal `mergeReviewed` handler with the expected head. The Plugin refreshes remote mergeability and Checks again and refuses a mismatch or failure. Only this Engine path can call the internal write handler; a direct Plugin Operation cannot bypass Review and Approval.

The GitHub Plugin calls `mergePullRequest` with `expectedHeadOid`. A head race therefore refuses the write. It chooses the existing permitted-method order: squash, merge, then rebase. It never queues Auto-merge or falls back to a different head. GitHub remains the authority for its own branch protections; remote state can change after any read. The expected head is the atomic boundary, not a claim that Checks cannot change between read and write.

An ambiguous network result is unknown, not success. The Plugin refreshes the pull request before the Engine reports its final outcome. It never blindly repeats a write after an unknown result.

Existing GitHub Auto-merge remains a separate user choice with GitHub's own gates. Argo readiness does not govern it. The UI names these actions separately and cannot imply that Auto-merge includes Argo Review or Approval. This decision adds explicit reviewed merge; it adds no auto-fix loop, automatic Argo Approval or Review posting to GitHub.

## UI boundary

The wide Changes Inspector continues to show the Session's Checkout. A separate Review Inspector tab shows Review state for one Change. The Workbench PR row still opens GitHub; its menu can open Review. The phone has the equivalent Review screen through the existing Inspector navigation model.

This extends ADR-0052's UI boundary without restoring PR file lists or PR diff navigation to the wide Changes tab. Paper approval in #2380 remains a separate prerequisite. Core draws all Review views from shared contracts and Server readiness.

## Required amendments and delivery

This decision amends these ADRs:

- ADR-0008: an Engine-created Reviewer Started Session owns a temporary detached Checkout, with the cleanup lifecycle above.
- ADR-0012 and ADR-0044: Review is a fourth authenticated Prompt sender. Engine-created Reviewer Sessions have the bounded scheduling exception above.
- ADR-0052: the Engine can consume the existing Change stream without an App. The GitHub Plugin can perform explicit reviewed merge through the guarded handler. A Review Inspector tab is separate from the Checkout-only Changes tab.

The implementation adds these glossary terms: Reviewer, Review, Finding, Score, Check and Argo Approval. Reviewer means a repository definition; its execution is a Reviewer run represented by a Started Session. A Review groups those runs for one Change head. Finding is a located problem from a run; Score is a bounded assessment with a direction and reason. A Check is a code host's reported result for a commit. Argo Approval is person-only consent for that Change head.

Issue coverage is explicit: #2374 owns the Change-provider contract and Engine subscription; #2375 owns definitions; #2376 owns storage and result validation. #2377 owns isolated runs and scheduling; #2378 owns actions and provenance; #2379 owns consent, readiness and the guarded Plugin write. #2380 retains the design gate; #2381 owns the Review tab and phone screen; #2382 proves the complete flow.

The implementation uses offline Plugin fixtures, real temporary git repositories and scripted ACP Agents. It tests absent commits, provider failure, invalid definitions and results, cancellation, caps, cleanup, provenance, consent and expected-head merge races. No test requires a live GitHub Account or a paid Agent.

## Considered options

- A core Forge adapter: rejected because it duplicates Plugin-owned transport and Account handling before another Forge requires it.
- Reviews entirely inside the GitHub Plugin: rejected because Session execution, consent and readiness belong to the Engine and must agree across callers.
- Reusing the Change Session's Checkout: rejected because Reviewer edits would affect the work under review.
- Implementing explicit merge by enabling Auto-merge: rejected because it can queue a later merge after the Review or Approval becomes stale.
- Making Auto-merge obey Argo readiness: rejected for this increment because it changes the existing owner-approved automation policy.
