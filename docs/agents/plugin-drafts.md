# Plugin Drafts

Read this before you draw or review a Plugin Draft: a page drawn from canned data, so the author reviews the design in the running App before any real read exists (ADR: `docs/adr/0057-plugin-designs-are-drawn-live-as-drafts-with-variants.md`; terms: Draft and Variant in `GLOSSARY.md`).

`plugin.guide` holds the protocol, in its Drafts section and its Draft step. It also holds the one list of minimum states. Run `argo run plugin.guide --wait`; do not copy the list or the steps here, so they cannot drift.

## What validate checks

`argo plugin validate <dir>` on a Plugin that declares `contributes.drafts`:

- Lists the minimum states a Draft page does not declare, at its `states` in `plugin.json`.
- Refuses a Draft Loader that calls `argo`, `read` or a real Operation, in a Plugin with or without Capabilities.
- Draws every Variant of every region on its own page, and refuses one whose Render throws or whose region node the kit dropped. It skips this when the source has other diagnostics, so fix those first.
- Exits 0 mid-Draft, and prints each region that still declares Variants as `Ship blocked`.

`argo plugin validate <dir> --ship` fails on those leftover Variants. Run it last, after the real page is built.

## Facts that bite

- `plugin.draft.show` rebuilds mid-Turn and needs the Server running with `--watch`. `region` is the region you write next, so Apps frame it; leave it out after the last one. `sessionId` is the caller's own Session for Agents.
- Region ids are unique across the page, since the App matches nodes by bare key. A region's label is its id, capitalised.
- A Variant pick is Page state `draftVariant.<regionId>` (`draftVariantKey` in `packages/contracts/src/plugins/drafts.ts`). An undeclared Page state key still reaches the Loader, but declare a default for each.
- Choose runs only in an App. It delivers the picks to the Session whose Agent last ran `plugin.draft.show`; read them with `argo run plugin.draft.pick`. Schemas: `packages/contracts/src/operations/plugin-drafts.ts`.

## Comments

A Choose carries the author's comments as well as the picks, and `plugin.draft.pick` returns both. Each comment names a node by its key, the region and Variant it sits in when it sits in one, and a note (`DraftComment`). Act on a comment by a targeted edit of that node, then run `plugin.draft.show`; do not start the Draft over. A comment names the key the Plugin gave the node, so give list rows and other repeated nodes keys that tell them apart. A comment is refused if it names a region or Variant the Draft does not declare. A Draft with no regions chooses once the author has left a comment: `picks` is then empty and the comments are what the Agent reads.
