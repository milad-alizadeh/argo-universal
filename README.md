# Argo Universal

Argo is a cockpit for coding agents. It runs Claude and Codex Sessions on your machine and shows them on iOS, Android, web, and macOS.

- `apps/universal-app`: the Expo app for iOS, Android, and web
- `apps/desktop`: the Electron shell that loads the web build
- `apps/server`: the local Server that owns Sessions, git, and storage
- `apps/storybook`: the web Storybook

Read `GLOSSARY.md` for the words and `docs/adr/` for the decisions. The first build is `docs/specs/0001-scaffold.md`.
