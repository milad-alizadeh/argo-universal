# How dev tools define and run "run the app" configurations

Researched 2026-11-19 from vendor docs (fetched pages, not source code). Nothing was run. Where a page did not say something, the claim is marked **unverified** rather than guessed. Several vendors changed their docs recently; those spots are flagged **recent**.

Short answer: nearly every tool keeps a named list of commands with `cwd`, `env` and a port; the split is who owns the file. Editors (VS Code, Zed, Claude Code, Codex, Cursor cloud) check a file into the repo. JetBrains defaults to personal and lets you opt into a shared file. Conductor now keeps scripts in the app, not the repo. Almost none of them solve parallel-worktree port collisions in the config file; Conductor (a port block per workspace) and Claude Code (`autoPort`) are the two that do.

## Summary table

| Tool | Storage | Named configs | Group | cwd / env | Ready detection | Port | Processes run | Collision handling | UI |
|---|---|---|---|---|---|---|---|---|---|
| Claude Code desktop | `.claude/launch.json`, checked in | yes (`configurations[]`) | no (list only) | yes / yes | not documented (**unverified**); it uses `port` | `port`, default 3000 | local, Browser pane | `autoPort`, `PORT` env | Dev servers menu, Browser pane |
| VS Code | `.vscode/launch.json`, `tasks.json`; user-level too | yes | `compounds` | yes / yes | `problemMatcher.background`, `serverReadyAction.pattern` | via pattern capture | integrated terminal or debug console, on the machine that hosts the workspace | none | Run button, terminal, auto-open URL |
| JetBrains | `.idea/workspace.xml` default; "Store as project file" shares | yes | compound | yes / yes | none documented | none | local | none documented | tool window tab per config |
| Zed | `.zed/tasks.json` or `~/.config/zed/tasks.json` | yes | tags only | yes / yes | none documented | none | terminal | none | task spawn modal, terminal |
| Cursor | `.cursor/environment.json` (cloud), `.cursor/worktrees.json` (setup only) | `terminals` | n/a | partial | none documented | Auto-Forward Ports | tmux in remote VM | not covered | Agents Window |
| Windsurf / Devin Desktop | no config documented | n/a | n/a | n/a | n/a | n/a | agent tool call | n/a | built-in browser pane |
| Replit | `.replit`, checked in | workflows | sequential or parallel (**unverified** here) | partial | port open (**unverified** here) | `[[ports]]` | remote container | one `localPort` to `externalPort` map | Run button, webview |
| Conductor | app settings, not the repo (**recent**) | Actions | no | yes (env vars) | none | `CONDUCTOR_PORT` to `+9` | local | port block per workspace | Run button menu |
| Codex app | `.codex/` folder, can be checked in | Actions | no | not documented | none | not documented | local, integrated terminal | not documented | top bar buttons |
| Dev Containers | `devcontainer.json` | `portsAttributes` per port | object form runs in parallel | `remoteEnv` | none | `forwardPorts` | container | `requireLocalPort` notices only | Ports view |
| Procfile (foreman, overmind, honcho) | `Procfile`, `.env` | process types | whole file | `.env` | none | `PORT` per process | local | base port plus steps | CLI, overmind tmux |
| Gitpod Classic | `.gitpod.yml` | `tasks[]` | no | `env` | port listening detected | `ports[]` | remote workspace | per-workspace URL | one terminal per task, preview |

## Claude Code desktop / web preview

- **Storage.** `.claude/launch.json` at the root of the folder you selected when starting the session. The docs say the file is committed ("Don't put secrets here since this file is committed to your repo"). JSON with comments is allowed. There is no personal/local override file in the docs. [Desktop docs](https://code.claude.com/docs/en/desktop)
- **Who writes it.** "Claude automatically detects your dev server setup and stores the configuration in `.claude/launch.json`." You can edit it by hand. Before Claude Desktop v2.37337.0 Claude also saved port answers into it. Same page. I found no built-in slash command or skill that writes the file; the search turned up only bug reports about `preview_start`. **Unverified** that none exists.
- **Schema.** Top level: `version`, `configurations[]`, optional `autoVerify`. Per entry: `name` (unique), `runtimeExecutable`, `runtimeArgs[]`, `port` (default 3000), `cwd` (relative to project root), `env`, `autoPort`, `program` + `args[]` (a Node script), `url` (what the preview opens instead of `http://localhost:<port>`). Several entries run a frontend and an API together; there is no compound. Same page.
- **Ready detection.** None documented; the config only carries the port. **Unverified** how the tool decides the server is up.
- **Ports and collisions.** `autoPort: true` finds a free port; `false` fails (for fixed OAuth callbacks); unset gives the next free port unless the port is hardcoded in an npm, yarn, pnpm or bun script. The docs say to read `PORT` from the environment, and Claude rewrites a `--port` or `-p` in `runtimeArgs` when it moves a server. Same page.
- **Where it runs, and remote clients.** In the local desktop app, the Browser pane's tools run the preview. In an SSH session Claude has no Browser pane tools, so no auto-verify, and the Dev servers menu is not available. To see a remote server you forward the port yourself with `ssh -N -L`; Desktop turns off `LocalForward` and the other forwarding options. Same page. Nothing about a phone or web client driving a preview.
- **Worktrees.** Worktree locations are documented for SSH sessions. User bug reports say relative `cwd` resolves against the session worktree, and that `launch.json` is not found inside `.claude/worktrees/<name>/` ([issue 86039](https://claudeissues.com/issue/86039-desktop-preview-panel-relative-launch-json-cwd-resolved-against-session-worktree), [issue 76496](https://claudeissues.com/issue/76496-bug-preview-start-fails-to-find-claude-launch-json-inside-nested-git-worktree-cl)). These are user reports, not vendor statements.
- **UI.** The pane's Dev servers menu starts and stops servers; a server card in chat has an Open button. Preview is a browser pane, not an interactive terminal. **Recent**: the schema and the Windows/SSH behaviour changed across 2026 releases.

## VS Code: `launch.json` and `tasks.json`

- **Storage.** `.vscode/launch.json` and `.vscode/tasks.json` per workspace. Personal copies: user-level tasks through "Tasks: Open User Tasks" (only `shell` and `process` types), and user-level launch configs under the `launch` key in user settings. [Tasks](https://code.visualstudio.com/docs/debugtest/tasks), [Debug configuration](https://code.visualstudio.com/docs/debugtest/debugging-configuration)
- **Schema.** Tasks: `label`, `type` (`shell` or `process`), `command`, `options.cwd/env/shell`, `dependsOn`, `dependsOrder` (`sequence`), `isBackground`, `group`, `runOptions.runOn: folderOpen`, `presentation` (`reveal`, `panel`, `focus`, `close`). Launch: `preLaunchTask`, `postDebugTask`, `env`, `envFile`, `cwd`, `console` (`internalConsole`, `integratedTerminal`, `externalTerminal`), `presentation` (`order`, `group`, `hidden`). Same pages.
- **Compounds.** A `compounds[]` entry "starts two or more launch configurations together", in parallel, with `configurations`, `stopAll` and an optional `preLaunchTask`. Debug page.
- **Ready detection.** Two mechanisms. A background task's `problemMatcher.background` has `activeOnStart`, `beginsPattern`, `endsPattern`; the page shows them but defines them only by example. A task in a `dependsOrder: sequence` chain needs such a matcher to say it is done. And `serverReadyAction` has `pattern` (regex on output, with a capture group), `uriFormat` (default `http://localhost:%s`) and `action` (`openExternally`, `debugWithEdge`, `debugWithChrome`, `startDebugging`). `killOnServerStop` is **unverified** (the page does not mention it).
- **Automatic runs.** `runOn: folderOpen` tasks are gated by `task.allowAutomaticTasks`, default off, and never run in an untrusted workspace. Tasks page.
- **Where it runs.** In the integrated terminal on whichever machine hosts the workspace. Remote and tunnel behaviour: **unverified** (not fetched).
- **Ports.** No allocation. The port comes from your command or from the captured output.
- **UI.** Run and Debug dropdown, task picker, terminal panel. Terminals are real PTYs, so stdin works (the `focus` option implies this; not stated outright).

## JetBrains run configurations

- **Storage.** Default is `.idea/workspace.xml`, which is personal. "Store as project file" writes a shareable file, default `.idea/runConfigurations`; for Git, share that folder and ignore the rest of `.idea`. Turning the option on "does not submit anything to the VCS". [Run configuration page](https://www.jetbrains.com/help/idea/run-debug-configuration.html), [Application config](https://www.jetbrains.com/help/idea/run-debug-configuration-application.html). The `.run/*.run.xml` location you asked about is **unverified**: neither fetched page mentions `.run`.
- **Schema.** Name, working directory (default project root), environment variables, Before launch tasks (run in listed order), and "Allow multiple instances" (off by default, so a rerun ends the earlier session). Application page.
- **Compound.** "Launch several run/debug configurations simultaneously", with only a name and an Add list; launch order is "not guaranteed". Nested compounds: **unverified**. [Compound page](https://www.jetbrains.com/help/idea/run-debug-configuration-compound.html)
- **Temporary configs.** Running a class with no saved configuration makes a temporary one; at most 5 are kept, then older ones are deleted; you can "Save Configuration". Run configuration page.
- **Ready detection, ports.** Not documented on these pages.
- **UI.** Each compound member gets its own tab in the Run or Debug tool window.

## Zed `tasks.json`

- **Storage.** Global `~/.config/zed/tasks.json` (all projects) and worktree-local `.zed/tasks.json`. [Zed tasks](https://zed.dev/docs/tasks)
- **Schema.** `label`, `command`, `args`, `cwd` (default project root), `env`, `use_new_terminal`, `allow_concurrent_runs`, `reveal` (`always`, `no_focus`, `never`), `hide` (`never`, `always`, `on_success`), `shell`, `show_summary`, `show_command`, `save`, `tags`, `hooks` (such as `create_worktree`). Variables: `ZED_WORKTREE_ROOT`, `ZED_FILE`, `ZED_MAIN_GIT_WORKTREE` and others, with `${VAR:default}`.
- **Rerun.** `task: rerun` reuses the terminal and waits for the previous run unless `allow_concurrent_runs` is on.
- **Ready detection, ports, compounds, debug scenarios.** Not described on the page. Note that "worktree" in Zed means a project root, not a git worktree.
- **UI.** Tasks run in Zed's terminal, so they are interactive.

## Cursor and Windsurf

- **Cursor cloud agents.** `.cursor/environment.json`, which the docs recommend committing. Keys on the page: `install` (run when a Build is created, must be idempotent), `start` (run when an agent boots), `terminals` (app processes; "These terminals run in a `tmux` session shared by you and the agent"), `build` (`dockerfile`, `context`), `snapshot`. Ports are not a key; "Auto-Forward Ports" is a toggle in the Agents Window. Builds use the default branch's file, so a feature-branch change must be pushed first. Self-hosted machines never read it. The `terminals` field shape: **unverified** (a linked JSON schema was not read). [Cloud agent setup](https://cursor.com/docs/cloud-agent/setup)
- **Cursor local worktrees.** `.cursor/worktrees.json` has only `setup-worktree`, `setup-worktree-unix` and `setup-worktree-windows` (commands or a script path). It has no run command and says nothing about ports. [Worktrees](https://cursor.com/docs/configuration/worktrees)
- **Cursor local agent servers.** Only forum reports (not vendor docs): agent-started dev servers can be hard to find in the terminal UI, and killing the agent shell can orphan the child process ([forum](https://forum.cursor.com/t/agent-started-long-running-servers-vite-disappear-from-the-terminal-ui-aborting-the-agent-shell-orphans-the-process-ppid-1/171517)). Useful as a warning about process ownership.
- **Windsurf / Devin Desktop.** **Recent**: search results say Windsurf is now Devin Desktop (third-party claim, **unverified**). Its previews "are opened via tool call", the agent "proxies your local dev server", and the preview opens as an editor tab, in the built-in browser pane, or in the system browser. No config file, port setting or ready detection is documented. [Devin previews](https://docs.devin.ai/desktop/previews.md)

## Replit

- **Storage.** `.replit` in the project. [Configuring a Repl](https://docs.replit.com/replit-workspace/configuring-repl)
- **Fields.** `run` (string or array, the Run button command), `entrypoint` (used when `run` is absent), `onBoot`, `[[ports]]` with `localPort` and `externalPort` (example: 3000 to 80), `[deployment]` with `run`, `build`, `ignorePorts`. Workflows (multiple named tasks, sequential or parallel, `waitForPort`) are described on a separate page. My fetch of that page returned 404, so `[workflows]`, `waitForPort` and `exposeLocalhost` are **unverified**.
- **Where it runs.** Remote container; the webview reaches `localPort` through the external mapping. UI details: **unverified**.

## Conductor and the Codex app

- **Conductor.** **Recent, and the docs disagree with older ones.** Current docs say scripts and actions are set in the app (Settings, repository, Scripts tab and Actions tab) and "saved in each person's Conductor, not in the repository". Search snippets of older docs described a repo-root `conductor.json` with `setup`, `run`, `archive` and a `runScriptMode` key, and a newer `.conductor/settings.toml`; I could not confirm either file from a fetched page, so treat file-based config as **unverified**. [Scripts reference](https://www.conductor.build/docs/reference/scripts), [Scripts](https://www.conductor.build/docs/core/scripts)
  - Hooks: setup ("After Conductor creates a workspace"), Actions ("When you click the Run button"; each has a name, icon, command; a Default action picks what the button runs), archive ("Before Conductor archives a workspace").
  - Env: `CONDUCTOR_WORKSPACE_PATH`, `CONDUCTOR_ROOT_PATH`, `CONDUCTOR_WORKSPACE_NAME`, and `CONDUCTOR_PORT`: "Conductor allocates ten ports to each workspace: `CONDUCTOR_PORT` through `CONDUCTOR_PORT+9`". Not set in cloud workspaces.
  - Run mode: Concurrent (default) or Nonconcurrent, where "Starting an action stops actions running in the repository's other workspaces" (for fixed ports, one local database, a shared Docker stack).
  - Stop: SIGTERM to the process group, then SIGKILL after five seconds; descendants in another group or session may survive (macOS local workspaces).
  - Sharing: commit the logic as repo scripts and make each Conductor script a one-line call; `.worktreeinclude` lists files to copy.
  - Output view (terminal or log): **unverified**.
- **Codex app.** "Local environments let you configure setup steps for worktrees as well as common actions for a project." Stored "inside the `.codex` folder at the root of your project", and can be checked in. Setup scripts run when a worktree is created, with per-OS overrides. Actions have a name, a command and an icon, run "within the app's integrated terminal", and appear in the top bar. Ports are not mentioned. [Local environments](https://learn.chatgpt.com/docs/environments/local-environment) (redirected from developers.openai.com; **recent**).

## Dev Containers and Codespaces

- **Storage.** `devcontainer.json`, checked in. [Spec reference](https://containers.dev/implementors/json_reference/). The folder layout is **unverified**.
- **Ports.** `forwardPorts` (always forwarded to the local machine). `portsAttributes` maps a port, `host:port`, range or regex to `label`, `onAutoForward` (`notify` default, `silent`, `ignore`), `protocol`, `requireLocalPort` (you are notified if the same local port is unavailable), `elevateIfNeeded`. `otherPortsAttributes` sets defaults. The spec's list does not include `openBrowser` or `openPreview`; those are **unverified** here.
- **Commands.** `postCreateCommand` (after `updateContentCommand`, once a user is assigned), `postStartCommand` (each container start), `postAttachCommand` (each tool attach), `waitFor` (which command a tool waits for, default `updateContentCommand`). A failing script stops later ones. Object form runs commands in parallel, e.g. `{"server": "npm start", "db": [...]}`.
- **Ready detection.** None; port forwarding follows detected listeners (**unverified** mechanism).
- **Remote control.** The tool (VS Code, a web client) attaches to the container and forwards ports; the client is remote, the processes are in the container.

## Procfile: foreman, overmind, honcho

- **Storage.** `Procfile` (process name and command) plus `.env`. Overmind loads `~/.overmind.env`, `./.overmind.env`, `./.env`, then `OVERMIND_ENV`; `OVERMIND_PROCFILE` selects another Procfile. [Overmind](https://github.com/DarthSim/overmind), [foreman](https://ddollar.github.io/foreman/), [honcho](https://honcho.readthedocs.io/en/latest/using_procfiles.html)
- **Ports.** Foreman: `$PORT` starts at the `-p` base and "increments by 100 for each new process line"; extra instances of one type add 1; the base "should be a multiple of 1000". Overmind: base 5000 by default, step 100, set with `-p`/`-P` or `OVERMIND_PORT`/`OVERMIND_PORT_STEP`. Honcho: the page fetched says nothing about `PORT`, so its allocation is **unverified**; it sets `HONCHO_PROCESS_NAME`.
- **Process control.** Overmind runs each process in a tmux window; `overmind restart <name>` and `stop <name>` act on one process (wildcards allowed); `overmind connect <name>` attaches to a live pane. By default one process dying stops the rest; `OVERMIND_CAN_DIE` and `-x` change that.
- **Collisions.** Within one Procfile only. Two worktrees using the same base port collide unless the base differs.

## Gitpod (Classic)

- **Status.** The classic docs now live under `ona.com/docs/classic`, and the top-level Gitpod docs URL redirects to ona.com (**recent**). Whether Classic is sunset: the pages fetched contain no notice, so **unverified**.
- **Storage.** `.gitpod.yml`. [Reference](https://ona.com/docs/classic/user/references/gitpod-yml)
- **Tasks.** "Each array element opens in its own terminal." `before` (every start, must end), `init` (run once, or in a prebuild), `command` (every start, need not end), `env`, `name`, `openMode` (`tab-after`, `tab-before`, `split-right`, `split-left`).
- **Ports.** `ports[]` with `port` (single or range such as `3000-3100`), `onOpen` (`open-browser`, `open-preview`, `notify` default, `ignore`), `visibility` (`private` default, `public`), `protocol`, `name`, `description`. "Gitpod detects the port and exposes it on a URL that requires authentication", at `<port>-<workspace-url>`. [Ports](https://ona.com/docs/classic/user/configure/workspaces/ports)
- **Collisions.** Each workspace has its own URL host, so ports do not collide across workspaces.

## Patterns and implications for Argo

### File versus database storage

- Checked-in file: Claude Code, VS Code, Zed, Codex, Cursor cloud, Replit, Dev Containers, Gitpod. Reasons given or implied: teammates and agents get the same commands without setup. Cursor adds a branch caveat: the default branch's file wins for cloud builds.
- Personal store: JetBrains by default (`workspace.xml`), and Conductor now (scripts "not in the repository"). Conductor's recommended workaround for sharing is repo scripts called by a one-line app script.
- Split pattern worth copying: a shared file plus a personal layer. VS Code does it with user-level tasks and launch settings; JetBrains with an opt-in share toggle. No tool documents a gitignored local override file. **Not found**, not "does not exist".
- The cost of the checked-in file: secrets. Claude Code warns not to put them in `env`.
- No vendor page gave a stated rationale beyond sharing with the team; the reasons above are inferred.

### Schema consensus

- Every tool has: a unique `name`, a command (as one string or as executable + args), `cwd` (default project root), `env`, and a list of entries.
- Common extras: `port` (Claude Code, Replit, Gitpod, devcontainer), a pre-step (VS Code `preLaunchTask`, JetBrains Before launch, Gitpod `before`), and groups (VS Code `compounds` with `stopAll`, JetBrains compound).
- Ready detection exists in only one form that is general: a regex on output (VS Code `pattern`, `endsPattern`), or a listening-port watch (Gitpod). Claude Code, Conductor and Zed document neither.
- Compounds start in parallel with no order guarantee (JetBrains says so explicitly); if order matters, tools add `dependsOn` or a `waitFor`.

### Port strategy for parallel worktrees

Four strategies in the wild:
1. Allocate a block per workspace and pass it in the environment: Conductor (`CONDUCTOR_PORT` to `+9`).
2. Let the runner pick a free port and rewrite the command: Claude Code `autoPort`, plus `PORT` env.
3. Fixed arithmetic from a base: foreman and overmind (step 100 per process), collision-prone across checkouts.
4. A per-workspace hostname so ports never collide: Gitpod, Codespaces-style forwarding.

Conductor's block plus a "nonconcurrent" escape hatch for fixed ports is the most complete model. Claude Code's `autoPort: false` for fixed OAuth callbacks is the same escape hatch.

### Terminal versus log view

- Interactive terminal (PTY): VS Code, Zed, Gitpod, Codex (integrated terminal), Cursor cloud (shared tmux), overmind (`connect`).
- Preview and browser pane without a terminal: Claude Code desktop, Devin Desktop. Their docs describe no log view; **unverified**.
- Overmind and Cursor use tmux so a human and an agent can share one live process.
- Conductor's stop is process-group SIGTERM then SIGKILL after 5 seconds, and it admits that descendants can survive. Cursor forum reports show orphaned servers. Both argue for owning the process group.

### One-time project setup versus per-branch

- Setup (install, copy `.env`) is per worktree: Conductor setup and archive, Codex setup scripts, Cursor `setup-worktree`, Zed `create_worktree` hook.
- The run commands are project-level and mostly the same on every branch; the file travels with the branch when checked in, which is why Cursor's cloud default-branch rule is notable.
- Per-branch variation that does matter: the port and the `cwd` (Claude Code user reports on worktree `cwd` and file lookup show how this breaks).

### Remote and mobile control

- No fetched source describes a phone or web client starting, stopping or viewing a process. Claude Code's SSH mode loses the preview and needs a manual `ssh -L`; Cursor cloud uses an Agents Window with port auto-forward. For Argo, where the Server owns the processes, this is open ground and cannot be copied from a source.

### Open questions (unverified above)

- How Claude Code decides a preview server is ready, and whether any skill writes `launch.json`.
- JetBrains `.run/*.run.xml`.
- Replit workflows, Honcho port allocation, VS Code `killOnServerStop`, Dev Container `openBrowser`-style values.
- Whether Conductor still reads a repo file.
