# A Session owns its Checkout, and the Server owns all git work

The model is Project, then Session. Each Session owns its Checkout: the Project's main checkout, or a worktree at `~/.argo/worktrees/<projectId>/<slug>` on branch `argo/<slug>`. There is no Workspace that several Sessions share. This carries over Argo ADR-0049.

The Server runs all git work by calling `git` and `gh` from `packages/git`. Apps only send requests.

## Considered Options

- Paseo's Project, Workspace, Agent model, where several agents share one worktree. Rejected: Argo's Session-owned worktree is simpler and is already proven.
