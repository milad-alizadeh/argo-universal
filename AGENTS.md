# Argo Universal

Argo for iOS, Android, web, and macOS: one Expo app, an Electron shell, and a local Server.

## Where things are written down

- Words: `GLOSSARY.md`. Use its terms in code, docs, and messages.
- Decisions: `docs/adr/`. Name any ADR that your change contradicts, and ask before you contradict it.
- Specs: `docs/specs/`. Build a spec as written. When it is unclear or wrong, stop and ask.

## Rules that no tool checks

- In source code, a vendor name (`claude`, `codex`) appears only inside `packages/agents/<agent>/`. Test mocks in `mocks/cli/<agent>/` carry it too. Shared code branches on capabilities that an adapter registers.
- Claude and Codex Sessions draw the same UI. Parity is part of every Session change.
- End-to-end tests mock only the Agent CLI, with mocks in `mocks/cli/<agent>/`.
- Test assets live outside `src/`: `e2e/<flow>/`, `mocks/`, `tools/`. Call them mocks.
- Screens get tRPC from `useTRPC()` only.
- Use full words in names, except domain acronyms and platform-fixed names.
- Validate outside data at its boundary with Zod. Reject, report, and count unrecognised shapes.
- Keep comments to one line unless a falsifiable fact needs more.
