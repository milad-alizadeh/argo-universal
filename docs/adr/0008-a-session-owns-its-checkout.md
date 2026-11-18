# A Session owns its Checkout, and the Server owns all git work

The model is Project, then Session. Each Session owns its Checkout: the Project's main checkout, or a worktree at `~/.argo/worktrees/<projectId>/<slug>` on branch `argo/<slug>`. There is no Workspace that several Sessions share. This carries over Argo ADR-0049.

The `<slug>` is a readable name, such as `brave-otter-3f2a91`, made from the Session id alone. Worktrees made before 2026-11-15 are named by the Session id itself, and still count as owned (#2152).

A Session that another Session started is the one exception: it borrows its parent's Checkout, because the Agent runs it there. It is read-only in Argo, and it is archived with its parent (owner, 2026-10-03).

Owner amendment, 2026-11-15 (#2125): a Started Session may borrow too. `session.new` takes a third Checkout, `starter`, which only a Session may pass: the Session it starts runs in the caller's own Checkout, on the caller's branch, so it sees the caller's uncommitted work. This is what lets an Agent with no ACP Agents of its own, such as Pi, delegate work on the code it is editing. A new worktree or the main checkout stay the other two choices.

- The borrower never owns the Checkout. Archiving or discarding it leaves the worktree and its branch alone, and the Project does not remember `starter` as where the person starts Sessions.
- Unlike an Agent, the borrower is a full Session: the person and other Sessions prompt it, and it writes to the Checkout. Nothing locks the working tree; the starter's Prompt coordinates the work, as it does for an Agent's own subagents.
- Archiving the Session that owns a worktree archives its open borrowers in the same decision, and Undo restores them together. The archive is refused while a borrower runs a Turn, since it would remove the worktree under it.
- A borrower's Checkout reads as `starter` when it is another Session's worktree, and as `main` when its starter runs in the main checkout.

The Server runs all git work, calling `git` and `gh` from `packages/git`; Apps only send requests.

## Considered Options

- Paseo's Project, Workspace, Agent model, where several agents share one worktree. Rejected: Argo's Session-owned worktree is simpler and is already proven. The 2026-11-15 amendment does not bring it back: a Checkout still has one owner, and a Session borrows only from the Session that started it.
- Let a Session borrow any Session's Checkout in its Project (2026-11-15). Not taken: the starter is the one Session known to be coordinating the work in that tree.
- Lock the working tree while a borrower writes (2026-11-15). Not taken: an Agent's in-process subagents already share its tree unlocked.

## Reviews under ADR-0061

Owner amendment, 2026-11-18 (#2373): [ADR-0061](0061-reviews-belong-to-the-engine-and-change-providers-own-remote-writes.md) adds Engine-created Reviewer Started Sessions. Each owns a temporary detached Checkout at the reviewed commit. It never borrows the Change Session’s Checkout. The Server removes it after the Agent stops and keeps the transcript and Review result. Ordinary Started Session Checkouts are unchanged.

## Caller-supplied branches

The owner approved an exception for #2250. A caller of `session.new` can supply the branch name for a worktree Checkout. A new branch starts at the requested base's `origin` tracking ref when present, with the local branch as a fallback.

When a requested branch is checked out, Argo reports the path holding it. A clean, unlocked linked worktree without a Session owner can be reused in place. The caller can also choose removal from its current path. Argo moves the worktree to the new Session's normal path in one Git operation, keeping the branch tip. Both choices require the path from the conflict and transfer ownership to the new Session. Argo stores that ownership separately from the branch name. The main Checkout and any Checkout recorded against another Session are ineligible.
