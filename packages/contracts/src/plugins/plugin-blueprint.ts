// What an Agent reads before it builds a Plugin: choices and how to check, with the components left to the generated reference.
export const pluginBlueprint = `# Build an Argo Plugin

A Plugin is a folder: \`plugin.json\` and a TypeScript entry that draws Argo's kit components. Argo runs it on the Server and draws it on every platform. This guide holds the choices. "Kit components" at the end indexes every component; run \`plugin.guide\` with \`{ "components": ["Screen", "List"] }\` for the props of those you use. Everything every Plugin needs is kit code: copy the file named beside your choice, never write sign-in, polling, caching or token handling yourself.

The Issue tracker (\`plugins/issue-tracker\`) is the reference Plugin. \`plugins/examples/github-sign-in\` is the smallest sign-in. \`docs/plugins/authoring.md\` holds the full API.

Plugins live in Argo's own repository for now: the kit is unpublished, so a Plugin in another Project cannot resolve it.

## Steps

1. Run \`plugin.new\` with an \`id\` (lower-case, dashes). It writes \`plugins/<id>/\` in this Session's Checkout: one page, one Operation that writes, one test. \`path\` is relative to the Checkout and \`directory\` is the absolute folder; look there. Done when the folder exists.
2. At the repository root run \`pnpm install\`, then \`pnpm --filter @argo/<id> check\`. \`check\` runs on the Plugin alone: Operation types, \`tsc\`, validation and the harness test. Done when it passes on the scaffold, before you change anything.
3. Turn the scaffold into your Plugin, one choice below at a time. Delete what you do not need: the notes page, \`notes.ts\`, and the \`addNote\` Operation in \`plugin.json\`, then run \`pnpm types\`. Done when \`check\` passes after each choice. A refusal names the declaration or call to fix: fix that, never work around it.
4. Look at it in Argo: \`ln -s "$PWD/plugins/<id>" ~/.argo/plugins/<id>\` loads it, and each edit reloads it. Open every state it has: signed out, loading, empty, error, loaded, on a phone-width window too. Done when you have seen each, or have said you could not run Argo.

## Choices

A page is \`{ state, load, render }\`. \`load\` reads and may be slow. \`render\` is pure: no hooks, no effects, no function props. A child component types \`to\` as \`PageTo\`. An event holds a value made by \`to\`: \`to.go(path)\`, \`to.set(change)\`, \`to.bind(key)\`, \`to.run(operation, args)\`.

| You need | Use | Copy |
| --- | --- | --- |
| A list | \`Screen\` holding a \`List\` of \`ListItem\`; many rows: a \`list\` loader and \`pagination\` | \`plugins/issue-tracker/filter-rows.tsx\` |
| One thing in full | \`Screen\` holding a \`Detail\`; its properties in the Screen's \`aside\` | \`plugins/issue-tracker/issue-detail.tsx\` |
| A board, a canvas, a chat | \`Screen width="bleed"\`, \`List layout="lanes"\` with \`onMove\`, \`footer\` for an input | \`docs/plugins/authoring.md\`, "Page frames" |
| Data from a URL or a command | a Query: \`read({ api: 'fetch', url })\`, with the \`fetch\` or \`process:exec\` Capability in \`plugin.json\` | \`docs/plugins/authoring.md\`, "Declared data" |
| Data two pages or a Slot share | a named read: \`argo.queries.define\`, \`projectOf\`, then \`argo.queries.read\` and \`seed\` | \`plugins/issue-tracker/github-reads.ts\` |
| A person's login at a service | \`deviceFlow\` + \`provideSignIn\` + \`signInGate\`; read as that person with \`accountFetch(argo, host)(url)\`, which throws \`SignInRequired\` for the gate to draw | \`plugins/examples/github-sign-in\`, \`plugins/issue-tracker/github-account.ts\` |
| Text a person types | \`TextArea\` or the Screen's \`search\` with \`onChangeText={to.bind('key')}\`; the text lands in Page state \`key\`, read as \`input.state.key\` |
| A change | an Operation declared in \`plugin.json\`, run with \`to.run\`, then \`argo.changed()\` | the scaffold's \`notes.ts\` |
| A change that must show now | \`to.run(name, args, { optimistic })\` patches nodes by \`key\` until the Operation answers | \`plugins/issue-tracker/issue-detail.tsx\` |
| To show in a row, bar, header or the Workbench | a Slot declared in \`plugin.json\` | \`docs/plugins/authoring.md\`, "Session Workbench card" |

Three states always look different. Loading: the App draws a page's own pending state while its loader reads, so a page never builds one; \`Detail isLoading\` or a \`Spinner\` is only for a part the page itself marks pending inside a render, as a body the loader left unread. Empty: an \`EmptyState\`. Failed: a \`Callout tone="danger"\` with a \`Button\` that runs an Operation, because any Operation run makes Argo read again. A Workbench card with nothing to show returns \`null\` from \`render\`, and Argo draws no card.

After an Operation edit in \`plugin.json\`, run \`pnpm types\` in the Plugin so \`to.run\` and the handler are checked against it.

## Test

\`index.test.ts\` opens a page and presses what a person presses: \`pages.open({ path })\`, \`page.press(label)\`, \`page.find(text)\`. A text matches a node's label, title, subtitle, description or text exactly; pass a function such as \`(node) => node.props.finished === true\` to test any prop. A Plugin that reaches a service names it to the test: \`test(name, async (kit, requests) => …, { services: ({ host, path }) => ({ json }) })\` answers every request the Plugin makes, so no test touches a real service, and \`requests\` lists what it asked. Open a page that reads an Account with \`projectId: kit.session.projectId\`: an Account is borrowed for a Project. Keep every test in \`*.test.ts\` on this harness; \`argo-plugin test\` runs them all, and another test runner's file fails there.

A reply's \`json()\` is \`unknown\`: narrow it with a type guard, as the Plugin's own lint rejects a cast. \`packages/plugin-kit/mocks/sign-in-plugins/device/index.tsx\` is a whole gated page with \`accountFetch\`.
`;
