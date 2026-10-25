# Plugins get only the Capabilities their manifest declares

This amends [ADR-0027](0027-plugins-act-through-one-api-hook-core-and-replace-named-components.md) (owner, 2026-10-16, Spec 0016 #725). ADR-0027 sends every Plugin call through `argo` but rejects a permission list for v1, so `argo.fs`, `argo.process` and `argo.fetch` reach anything the user can. ADR-0027 says `argo` is what makes a later list possible. Adding it now, before any third-party Plugin loads, is cheaper than tightening it later: VS Code, Obsidian and Claude Code all trust plugins at install, and none of them can restrict plugins afterwards without breaking them. The design copies Zed's host functions, Tauri's scopes and defaults, Figma's `networkAccess` and Chrome's install consent.

## Decision

- **A Capability is something the manifest declares, and the Server checks every call against it.**
  - The checker in `PluginServices` decides before an `argo.fs`, `argo.process` or `argo.fetch` call runs. Calls never check themselves.
  - A refused call returns an error to the Plugin and is logged with the Plugin's id.
  - Deny beats allow. Nothing is granted beyond the manifest (Tauri), unlike Zed's grant-everything default.
  - For `argo.process`, the check runs on the argv that leaves ADR-0027's `process.spawn` hook chain, against the calling Plugin's Capabilities. A hook that rewrites a command can't widen it. Hooking `process.spawn` sees other Plugins' commands, so it is a Capability of its own.
- **Files: read Projects, read and write only the Plugin's data folder.**
  - Any Plugin may read files inside any Project the Server has registered, with no Capability, as Zed's `Worktree` allows.
  - Each Plugin may read and write its data folder, `~/.argo/plugin-data/<id>/` (#725), like Zed's per-extension work directory. A Plugin can never write to its own code folder. Nor can it write its `argo.storage` database, `plugin.db` and its `-wal`/`-shm` files in the data folder, which the Engine holds open (#1170).
  - `argo.fs` never writes to a Project. Agents change code.
  - Every path is resolved first. `..` and symlinks that lead outside the allowed folders are refused (Tauri). The check is made on the file that was actually opened, so swapping a path after it was checked gains nothing.
- **Programs: listed commands and arguments only.**
  - The manifest lists each command with the argument patterns it may take, for example `{ "kind": "process:exec", "command": "gh", "args": ["issue", "list", "**"] }`. Unlisted commands don't run.
  - A command runs with its working directory in a registered Project or the Plugin's data folder. It defaults to the data folder. A command run in a Project can change it (`git checkout`), and consent says so.
  - A child process gets PATH, HOME, LANG and TMPDIR from the Server, plus variables the manifest names. Variables that load code or name a program are always refused, because Deno shows they bypass an allowlist. Examples are `LD_*`, `DYLD_*`, `NODE_OPTIONS`, `NODE_PATH`, `ELECTRON_RUN_AS_NODE`, `PYTHONPATH`, `PERL5OPT`, `BASH_ENV`, `GIT_SSH_COMMAND` and `GIT_CONFIG_*`.
  - Some commands can run other programs or name files outside the allowed folders, depending on their arguments. Examples are a shell or interpreter (`sh`, `node`, `python`, `npx`), `env`, `xargs`, `find -exec`, `git -c`, `gh extension` and `gh issue create --body-file`. Such a command may be declared, but consent labels it "Full access to your Mac" unless its patterns rule that out: allowing one allows everything (Deno). A trailing `**` counts as Full access unless Argo has reviewed that command's arguments.
- **Network: listed hosts over HTTPS only.** `{ "kind": "fetch", "host": "api.github.com" }`.
  - The parsed hostname and port must match exactly.
  - The Server follows redirects itself, checking each hop's host and HTTPS. A hop to an undeclared host is refused.
  - A raw IP address, localhost or `*` needs a `reason`, as Figma requires for `*`. After DNS lookup, a loopback or private address is refused unless it was declared that way, which stops DNS rebinding.
  - The Server owns TLS settings.
- **Storage, secrets and settings need no Capability.** Each Plugin already sees only its own (ADR-0025).
- **Grants belong to one Plugin from one source.** A Plugin installed from a different source under the same id starts with no Grants.
- **First-party Plugins are granted at load, with no prompt.** They declare their Capabilities like any Plugin and the Server enforces them, so an undeclared call fails in tests. Chrome treats its component extensions the same way. There is one code path, with no trusted bypass. Dev Plugins in the repo's `plugins/` load as first-party.
- **Third-party Plugins don't load until consent and isolation exist.** The loader reports them and skips them, like Obsidian's Restricted mode. This includes Agent-written dev Plugins outside the repo's `plugins/` (ADR-0027).
  - The Plugin worker's `vm` context isn't a security boundary: Node says so. Before third-party Plugins load, the Plugin host needs an operating-system boundary. A later ADR picks it.
  - Once Settings › Plugins has a consent screen, installing shows what the Plugin asks for (Chrome's install dialog, Figma's Community page).
  - An update that asks for more turns the Plugin off until the user approves it (Chrome).
  - The user can remove any single Grant, and the removal applies from the Plugin's next call.

## Considered options

- **Keep ADR-0027's unrestricted `argo` until third-party Plugins.** Rejected: every first-party Plugin written before then would assume full access, and the list would arrive as a breaking change.
- **`argo.fs` may write to Projects.** Rejected: Agents make code changes, and a write Capability would make every Plugin a supply-chain risk to the user's repos.
- **Prompt for first-party Plugins too.** Rejected: the user can't meaningfully refuse what Argo ships, and Argo's own Issue tracker would prompt on first run.
- **Load third-party Plugins now with a warning.** Rejected: an install warning doesn't enforce anything (Claude Code, VS Code), and a model where users click through warnings is the one this ADR replaces.
- **Let each `argo` call check itself,** as Tauri leaves to each command. Rejected: Tauri's own docs warn that scattered checks let bypasses slip in.
- **Treat only shells and interpreters as Full access.** Rejected: many ordinary commands run programs or read any file through their arguments, so a short deny list would look safe and not be.
