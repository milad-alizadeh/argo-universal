# Argo Universal

Argo is a cockpit for coding agents. It runs Claude and Codex Sessions on your machine and shows them on iOS, Android, web, and macOS.

- `apps/universal-app`: the Expo app for iOS, Android, and web
- `apps/desktop`: the Electron shell that loads the web build
- `apps/server`: the local Server that owns Sessions, git, and storage
- `apps/storybook`: the web Storybook
- `e2e`: the Playwright specs for web and Electron

Read `GLOSSARY.md` for the words and `docs/adr/` for the decisions.

## Run it

Node 24 and pnpm 12. `pnpm install`, then:

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the Server, Metro, and Electron. |
| `pnpm --filter @repo/universal-app ios` | Builds and opens the iOS development build. |
| `pnpm --filter @repo/universal-app android` | Builds and opens the Android development build. Run `adb reverse tcp:8081 tcp:8081` and `adb reverse tcp:7337 tcp:7337` first. |
| `pnpm dev:storybook` | Opens the web Storybook. On device, pick "Open Storybook" in the dev menu. |
| `pnpm quality` | Runs sherif, Biome, type checks, and Vitest. |
| `pnpm test:e2e` | Builds the web export and runs Playwright on it; skips both when nothing they depend on changed. |
| `pnpm test:e2e:electron` | Runs Playwright in Electron against the web export. |

The Server keeps its data in `~/.argo`. Set `ARGO_HOME` to use another folder.
