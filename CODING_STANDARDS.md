# Coding standards

The reviewer applies every rule here to the diff and reports each breach with the rule it breaks.

## Prickles

The coding standard is the Prickles canon v2.0, verbatim in `docs/agents/prickles/` (https://prickles.org, CC BY-NC 4.0). Read every pillar file before you review code. It wins over everything else in this repo; ADR-0016 records how it applies where it cannot as written.

## App

- Claude and Codex Sessions draw the same UI. Parity is part of every Session change.
- Use LegendList (`@legendapp/list/react-native`) by default for lists in the App.
- Name screens and views `<entity>-<list|detail|new|edit>-{screen,view}`. No two names may differ only by plural, and none may use a "settings" infix. Folders follow `docs/agents/screens.md`.
- The product name lives only in app config, environment variables and UI text, so a rename stays small. The Session branch prefix in `packages/git` is stored data and stays as it is.

## Adapters

- Reject, report and count unrecognised outside data. Check a change to an adapter or its response mocks against ADR-0015 and the installed SDK or generated protocol types.
