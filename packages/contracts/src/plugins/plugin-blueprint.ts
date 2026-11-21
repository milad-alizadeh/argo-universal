import {
  draftStateIds,
  draftStateKey,
  draftVariantKey,
  type DraftStateId,
} from './drafts';

// What each state of the minimum set draws; the one definition, so the list cannot drift from `draftStateIds`.
const stateDraws: Record<DraftStateId, string> = {
  loading:
    "the page's Screen with its title and a blank body, as the App draws it while the Loader first reads",
  empty: 'an `EmptyState`',
  error: 'a `Callout tone="danger"` with a `Button` that runs an Operation',
  'signed-out': 'the sign-in gate, or the message of a refusal',
  pending: 'a part the page marks pending: `Detail isLoading` or a `Spinner`',
  populated: 'the page full of canned data',
};

const minimumStates = draftStateIds
  .map((id) => `- \`${id}\`: ${stateDraws[id]}`)
  .join('\n');

// What an Agent reads before it builds a Plugin: choices and how to check, with the components left to the generated reference.
export const pluginBlueprint = `# Build an Argo Plugin

A Plugin is a folder: \`plugin.json\` and a TypeScript entry that draws Argo's kit components. Argo runs it on the Server and draws it on every platform. This guide holds the choices. "Kit components" at the end indexes every component; run \`plugin.guide\` with \`{ "components": ["Screen", "List"] }\` for the props of those you use. Everything every Plugin needs is kit code: copy the file named beside your choice, never write sign-in, polling, caching or token handling yourself.

The Issue tracker (\`plugins/issue-tracker\`) is the reference Plugin. \`templates/plugins/github-sign-in\` is the smallest sign-in.

Plugins live in Argo's own repository for now: the kit is unpublished, so a Plugin in another Project cannot resolve it.

## Steps

1. Run \`plugin.new\` with an \`id\` (lower-case, dashes). It writes \`plugins/<id>/\` in this Session's Checkout: one page, one Operation that writes, one test. \`path\` is relative to the Checkout and \`directory\` is the absolute folder; look there. Done when the folder exists.
2. At the repository root run \`pnpm install\`, then \`pnpm --filter @argo/<id> check\`. \`check\` runs on the Plugin alone: Operation types, \`tsc\`, validation and the harness test. Done when it passes on the scaffold, before you change anything.
3. Before real data code, draw a Draft (\`## Drafts\`): the design, drawn from canned data, in the running App, until the author chooses from it. Done when the author has chosen and \`argo plugin validate\` passes, or you have said you could not run Argo.
4. Turn the scaffold into your Plugin, one choice below at a time. Plugin files, tests included, must pass the repository lint gates. Plugin code runs without Node or browser globals. Build the real page from the Draft's chosen Variants and delete the Draft declarations and the Variants you did not choose. Delete what you do not need: the notes page, \`notes.ts\`, and the \`addNote\` Operation in \`plugin.json\`, then run \`pnpm types\`. Done when \`check\` passes after each choice. A refusal names the declaration or call to fix: fix that, never work around it.
5. Look at it in Argo: \`ln -s "$PWD/plugins/<id>" ~/.argo/plugins/<id>\` loads it, and each edit reloads it. Open every state it has: signed out, loading, empty, error, loaded, on a phone-width window too. Done when you have seen each, or have said you could not run Argo.

## Choices

A page is \`{ state, load, render }\`. \`load\` reads and may be slow. \`render\` is pure: no hooks, no effects, no function props. A child component types \`to\` as \`PageTo\`. An event holds a value made by \`to\`: \`to.go(path)\`, \`to.set(change)\`, \`to.bind(key)\`, \`to.run(operation, args)\`.

| You need | Use | Copy |
| --- | --- | --- |
| A list | \`Screen\` holding a \`List\` of \`ListItem\`; draw tracker rows with \`issueRow\` from \`@argo/plugin-kit\`; many rows: a \`list\` loader and \`pagination\` | \`plugins/issue-tracker/filter-rows.tsx\` |
| One thing in full | \`Screen\` holding a \`Detail\`; its properties in the Screen's \`aside\` | \`plugins/issue-tracker/issue-detail.tsx\` |
| Cards a person moves between columns | \`Screen width="bleed"\` holding a \`Board\` of \`Board.Column\` and \`Board.Card\`, each card's \`movesTo\` naming where it may go; \`onMove\` fills an Operation call | \`plugins/jira/issue-board.tsx\` |
| A canvas, a chat | \`Screen width="bleed"\`, \`footer\` for an input | \`packages/contracts/src/plugins/screen-frame.test.ts\` |
| Data from a URL or a command | a Query: \`read({ api: 'fetch', url })\`, with the \`fetch\` or \`process:exec\` Capability in \`plugin.json\` | \`plugins/issue-tracker/github-reads.ts\` |
| Data two pages or a Slot share | a named read: \`argo.queries.define\`, \`projectOf\`, then \`argo.queries.read\` and \`seed\` | \`plugins/issue-tracker/github-reads.ts\` |
| One Project's data on a page | the Project in the path, \`/projects/:project\`, read through named reads whose \`projectOf\` names it; a nav page has no \`context.projectId\` | \`plugins/jira/jira-pages.tsx\` |
| A personal API token a person pastes | \`tokenPaste\` + \`provideSignIn\` + \`signInGate\`, with a \`signIn\` Operation whose \`token\` param is \`"secret": true\`; read with \`accountFetch\` | \`packages/plugin-kit/mocks/token-paste-plugins/token/index.tsx\` |
| A person's login at a service | \`deviceFlow\` + \`provideSignIn\` + \`signInGate\`; read as that person with \`accountFetch(argo, host)(url)\`, which throws \`SignInRequired\` for the gate to draw | \`templates/plugins/github-sign-in\`, \`plugins/issue-tracker/github-account.ts\` |
| Text a person types | \`TextArea\` or the Screen's \`search\` with \`onChangeText={to.bind('key')}\`; the text lands in Page state \`key\`, read as \`input.state.key\` |
| A change | an Operation declared in \`plugin.json\`, run with \`to.run\`, then \`argo.changed()\` | the scaffold's \`notes.ts\` |
| A change that must show now | \`to.run(name, args, { optimistic })\` patches nodes by \`key\` until the Operation answers | \`plugins/issue-tracker/issue-detail.tsx\` |
| To show in a row, bar, header or the Workbench | a Slot declared in \`plugin.json\` | \`packages/contracts/src/plugins/session-workbench-card.test.ts\` |

Three states always look different. Loading: while a page's loader first reads, the App draws the page's Screen with a blank body, and a revisit draws the kept tree, so a page never builds a loading state for that read; \`Detail isLoading\` or a \`Spinner\` is only for a part the page itself marks pending inside a render, as a body the loader left unread. Empty: an \`EmptyState\`. Failed: a \`Callout tone="danger"\` with a \`Button\` that runs an Operation, because any Operation run makes Argo read again. A Workbench card with nothing to show returns \`null\` from \`render\`, and Argo draws no card.

A Draft is the exception to the loading rule: it draws a loading state, because the author reviews that design too.

After an Operation edit in \`plugin.json\`, run \`pnpm types\` in the Plugin so \`to.run\` and the handler are checked against it.

## Drafts

A Draft is a page of your Plugin drawn from canned data, so the author reviews the design in the running App on every platform before any real read exists. It never ships. Needs the Server running with \`--watch\`, loading your Plugin.

Declare each Draft page in \`plugin.json\` under \`contributes.drafts\`: \`{ "page": "/", "states": [...], "regions": [{ "id": "header", "variants": [{ "id": "compact", "name": "Compact" }] }] }\`. Then:

1. Draw a keyed skeleton: the page's Loader answers canned data and the Render's nodes carry \`key\`s. A Draft Loader makes no \`argo\` call, no \`read\` and no real Operation, even in a Plugin that holds Capabilities; \`validate\` refuses it.
2. Fill one region per edit. Finish a region, then run \`plugin.draft.show\` with \`pluginId\` and \`region\`, the region you write next, so the App frames it; leave \`region\` out after the last. It rebuilds the Plugin mid-Turn and swaps the worker only when the build passes: a broken build keeps the Draft on screen and returns the error, so fix it with a targeted edit and run it again. Every other edit waits for the Turn to end.
3. Draw every state of the minimum set, and declare each in \`states\`. The App's State menu puts the chosen one in Page state \`${draftStateKey}\`, so the Loader answers canned data per state:
${minimumStates}
4. A region is a node whose \`key\` is the region's \`id\`. Region ids are unique across the page, since the App matches nodes by bare key, and its label is the capitalised \`id\`. A Variant is picked in Page state \`${draftVariantKey('<regionId>')}\`, which the Loader and the Render read as \`input.state\`; declare a default for each in the page's \`state\`. Offer Variants only where the design has a real choice, and make them differ in structure, not in colour or copy. Fix a refusal or a note with a targeted edit of the node or region, never by starting the Draft over.
5. Run \`argo plugin validate\`. It draws every Variant of every region, refuses one that throws or whose region node the kit dropped, and lists the minimum states a Draft page lacks. A Plugin mid-Draft is valid; it also reports leftover Variants as "Ship blocked". It skips drawing Variants while the source has other diagnostics, so fix those first.
6. The author picks one Variant per region in the App and chooses, which hands the picks to the Session whose Agent last ran \`plugin.draft.show\`. Read them again, with the comments, with \`plugin.draft.pick\` (\`argo run plugin.draft.pick --params '{"pluginId":"<id>"}'\`), or after a restart.
7. Build the real page from the chosen Variants, delete the Variant declarations, then run \`argo plugin validate --ship\`: it fails while any Variant declaration remains.

Comments: the choice carries the author's comments, each naming a node by its \`key\`, its region and Variant, and a note. Act on each comment with a targeted edit of that node, then run \`plugin.draft.show\` again; never start the Draft over for a comment.

A terminal Agent runs the same Operations with \`argo run\`. \`docs/agents/plugin-drafts.md\` holds the reference.

## Test

\`index.test.ts\` opens a page and presses what a person presses: \`pages.open({ path })\`, \`page.press(label)\`, \`page.find(text)\`. A text matches one of a node's text props exactly; pass a function such as \`(node) => node.props.finished === true\` to test any prop. A Plugin that reaches a service names it to the test: \`test(name, async (kit, requests) => …, { services: ({ host, path }) => ({ json }) })\` answers every request the Plugin makes, so no test touches a real service, and \`requests\` lists what it asked. Open a page that reads an Account with \`projectId: kit.session.projectId\`: an Account is borrowed for a Project. Keep every test in \`*.test.ts\` on this harness; \`argo-plugin test\` runs them all. A journey it cannot hold, such as one across two Projects, runs on Vitest instead: \`plugins/issue-tracker/journeys.integration.test.ts\`.

A reply's \`json()\` is \`unknown\`: narrow it with a type guard, as the Plugin's own lint rejects a cast. \`packages/plugin-kit/mocks/sign-in-plugins/device/index.tsx\` is a whole gated page with \`accountFetch\`.
`;
