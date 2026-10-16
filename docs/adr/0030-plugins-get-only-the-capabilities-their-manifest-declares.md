# Plugins get only the Capabilities their manifest declares

This amends [ADR-0027](0027-plugins-act-through-one-api-hook-core-and-replace-named-components.md) (owner, 2026-10-16, Spec 0016 #725). ADR-0027 sends every Plugin call through `argo` but rejects a permission list for v1, so `argo.fs`, `argo.process` and `argo.fetch` reach anything the user can. ADR-0027 says `argo` is what makes a later list possible. Adding it now, before any third-party Plugin loads, is cheaper than tightening it later: VS Code, Obsidian and Claude Code all trust plugins at install, and none of them can restrict plugins afterwards without breaking them. The design copies Zed's host functions, Tauri's scopes and defaults, Figma's `networkAccess` and Chrome's install consent.

## Decision

- **A Capability is something the manifest declares, and the Server checks every call against it.** The checker in `PluginServices` decides before an `argo.fs`, `argo.process` or `argo.fetch` call runs. A refused call returns an error to the Plugin and is logged with the Plugin's id. Deny beats allow. Nothing is granted beyond the manifest (Tauri), unlike Zed's grant-everything default.
- **Files: read the Project, write only the Plugin's own folder.**
  - Any Plugin may read files inside the Project it is called for, with no Capability, as Zed's `Worktree` allows.
  - Each Plugin gets one private folder it may read and write, like Zed's per-extension work directory.
  - Plugins never write to a Project. Agents change code.
  - Every path is resolved first. `..` and symlinks that lead outside the allowed folders are refused (Tauri).
- **Programs: listed commands and arguments only.**
  - The manifest lists each command with the argument patterns it may take, for example `{ "kind": "process:exec", "command": "gh", "args": ["issue", "**"] }`. Unlisted commands don't run.
  - A command runs only in a Project or the Plugin's folder.
  - A child process gets PATH, HOME, LANG and TMPDIR plus variables the manifest names. `LD_*`, `DYLD_*` and `NODE_OPTIONS` are always refused, because Deno shows they bypass an allowlist.
  - A shell or interpreter (`sh`, `node`, `python`, `npx`) may be declared, but consent labels it "Full access to your Mac": allowing one allows everything (Deno).
- **Network: listed hosts over HTTPS only.** `{ "kind": "fetch", "host": "api.github.com" }`. A raw IP address, localhost or `*` needs a `reason`, as Figma requires for `*`. The Server owns TLS settings.
- **Storage, secrets and settings need no Capability.** Each Plugin already sees only its own (ADR-0025).
- **First-party Plugins are granted at load, with no prompt.** They declare their Capabilities like any Plugin and the Server enforces them, so an undeclared call fails in tests. Chrome treats its component extensions the same way. There is one code path, with no trusted bypass.
- **Third-party Plugins don't load until consent exists.** The loader reports them and skips them, like Obsidian's Restricted mode. Once Settings › Plugins has a consent screen:
  - installing shows what the Plugin asks for (Chrome's install dialog, Figma's Community page);
  - an update that asks for more turns the Plugin off until the user approves it (Chrome);
  - the user can remove any single Grant.

## Considered options

- **Keep ADR-0027's unrestricted `argo` until third-party Plugins.** Rejected: every first-party Plugin written before then would assume full access, and the list would arrive as a breaking change.
- **Plugins may write to the Project.** Rejected: Agents make code changes, and a write Capability would make every Plugin a supply-chain risk to the user's repos.
- **Prompt for first-party Plugins too.** Rejected: the user can't meaningfully refuse what Argo ships, and Argo's own Issue tracker would prompt on first run.
- **Load third-party Plugins now with a warning.** Rejected: an install warning doesn't enforce anything (Claude Code, VS Code), and a model where users click through warnings is the one this ADR replaces.
- **Let each `argo` call check itself,** as Tauri leaves to each command. Rejected: Tauri's own docs warn that scattered checks let bypasses slip in.
