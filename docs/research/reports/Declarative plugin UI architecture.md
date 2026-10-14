# Plugins write React; Argo draws every pixel

Research date: 2026-10-14. Input to the Plugins grilling in #506; nothing here is a decision.

The design agreed in conversation holds up against the evidence. A Plugin is written as real React on the Server, a reconciler turns it into a JSON tree of Argo primitive names with token-only props, and the App draws that tree with its own components. Raycast and Claude Code mods already work this way, and every system that looks native on a phone (Shopify, Adaptive Cards, Airbnb, Nubank) depends on the same rule: the App owns a closed set of components and the plugin only names them. What the evidence adds is the effect of distance. Raycast and mods draw UI on the same machine as the plugin code, but an Argo phone sits across a network from it. Every system built for that gap (LiveView, Hyperview, rfw, Block Kit) keeps the instant parts of the UI in the client. So this report recommends three refinements to the agreed design. Navigation and other Argo actions are declared in the tree (`href`), so a tap never waits for the Server. Text fields, pickers and pending states live in the App, and the Server confirms them. The wire carries numbered snapshots and id-keyed patches, so a reconnecting phone can always resync. With those refinements, the same closed catalog makes plugins native-looking, safe on both app stores, testable from fixtures in Storybook, and writable by an Agent. Claude Code mods show that last loop working in practice.

## The design in brief: React on the Server, primitive names on the wire

A Plugin is a folder of TypeScript on the Server. It runs in its own worker inside a supervised plugin process, never in the App. Its pages and slot contents are React components built from `@argo/plugin` primitives. Hooks work, and authors can write their own components. A custom React reconciler in the worker flattens all of that into nodes such as `{ type: "ListItem", props: {...} }`, because author components disappear before anything is sent. The Engine validates the nodes, resolves fallbacks for the phone's catalog version, works out what changed, and pushes it over the existing tRPC WebSocket (ADR-0002). The App holds a registry from each `type` to a real Argo primitive: SwiftUI or Compose on the phone, Uniwind on web and desktop (ADR-0020). When the user presses or types, the App sends `{node, event, value}` back. The worker runs the matching closure, re-renders, and the Engine sends a patch.

```
Plugin worker (Server)          Engine (Server)                    App (phone / desktop / web)
TSX + hooks + handlers  ──►  validate · fallback · diff  ──tRPC──►  registry: type → Argo primitive
        ▲                                                              │
        └──────────── run handler for node id ◄──── {node, event, value} ┘
```

There are three kinds of extension. **Pages** get their own stack through the catch-all route `(shell)/plugins/[pluginId]/[...path].tsx` and open from a Rail item or a Settings section. **Slots** are filled from `<PluginSlot name="composer.above" context={…} />` in core pages. **Non-UI contributions** are providers such as an Issue tracker, commands, and Agent tools over MCP. Core pages stay hand-written React. For Issues, Argo should keep owning the screens and let Linear, Jira and GitHub Issues supply data as providers. Declarative pages are for things nobody at Argo designed, such as a Sentry page or a weather band. The examples below still use Issues because everyone knows the shape. They show the mechanism and do not reverse that recommendation.

## A Cycle 12 page and an AU-16 page, end to end

### What the author writes

The Plugin declares a nav and its routes. The nav is the desktop sidebar and the root screen of the phone stack. Each route is an ordinary React component. `IssueRow` below is the author's own component. It never reaches the App, because it resolves to Argo's `ListItem`.

```tsx
// ~/.argo/plugins/tracker-demo/src/index.tsx: runs in the Plugin's worker on the Server
import { definePlugin, Page, Nav, Section, ListItem, Properties, Property,
         Markdown, TextField, SessionList, useAsync } from "@argo/plugin";
import { tracker } from "./tracker-client";

export default definePlugin({
  nav: TrackerNav,                       // desktop: sidebar · phone: root of the Plugin's stack
  routes: { "cycles/:id": CyclePage, "issues/:id": IssuePage },
});

function TrackerNav() {
  const cycles = useAsync(() => tracker.cycles(), []);
  return <Nav items={(cycles.data ?? []).map((c) => ({ label: c.name, icon: "calendar", href: `cycles/${c.id}` }))} />;
}

function CyclePage({ params }: { params: { id: string } }) {
  const cycle = useAsync(() => tracker.cycle(params.id), [params.id]);
  if (!cycle.data) return <Page title="Cycle" loading />;
  return (
    <Page title={cycle.data.name} meta={cycle.data.dates}
      actions={[{ id: "new", label: "New issue", icon: "plus", href: "issues/new", presentation: "sheet" }]}>
      {cycle.data.groups.map((g) => (
        <Section key={g.status} title={g.label} count={g.issues.length}>
          {g.issues.map((issue) => <IssueRow key={issue.identifier} issue={issue} />)}
        </Section>
      ))}
    </Page>
  );
}

// The author's own component: plain React, gone before anything is sent.
function IssueRow({ issue }: { issue: Issue }) {
  return (
    <ListItem
      icon={{ name: statusIcon(issue.status), tone: statusTone(issue.status) }}
      title={issue.title}
      meta={issue.identifier}
      accessories={[{ badge: { label: issue.label, tone: "accent" } }, { avatar: issue.assignee }]}
      href={`issues/${issue.identifier}`}
    />
  );
}
```

### What crosses the wire

The App receives a flat map of nodes keyed by id. Ids come from React keys, so a node keeps its id when rows move. There are no closures, class names or pixels in it. The `href` is data, so the App pushes the AU-16 screen the moment the row is tapped, with no round trip. (Trimmed to one row.)

```json
{
  "op": "snapshot",
  "surface": "page:tracker-demo:cycles/12",
  "rev": 1,
  "root": "page",
  "nodes": {
    "page": {
      "type": "Page",
      "props": {
        "title": "Cycle 12",
        "meta": "6–19 Oct",
        "actions": [{ "id": "new", "label": "New issue", "icon": "plus", "href": "issues/new", "presentation": "sheet" }]
      },
      "children": ["started"]
    },
    "started": { "type": "Section", "props": { "title": "In Progress", "count": 1 }, "children": ["started/AU-16"] },
    "started/AU-16": {
      "type": "ListItem",
      "props": {
        "icon": { "name": "status-in-progress", "tone": "warning" },
        "title": "Plugin pages open from the Rail",
        "meta": "AU-16",
        "accessories": [{ "badge": { "label": "Feature", "tone": "accent" } }, { "avatar": "Milad" }],
        "href": "issues/AU-16"
      }
    }
  }
}
```

On desktop the `ListItem` is one line with its accessories trailing. On the phone it is two lines, with the accessories under the title. The Plugin does not know which one it got. The `IssueRow` shape agreed in conversation becomes Argo's existing `ListItem` extended with `meta` and `accessories`, so a Sentry error row gets the same adaptive drawing for free. This also follows the rule that features extend a primitive and never copy one.

### The AU-16 page and one round trip

The issue page shows the three kinds of interaction. A `Property` with `options` runs a closure on the Server. `SessionList` is an Argo-owned component bound to Argo data: the App fetches those Sessions itself, so the Plugin passes only an identifier. A `TextField` keeps its draft in the App and sends only on submit. Changing the field's `key` remounts it empty, which is the React way to clear it.

```tsx
function IssuePage({ params }: { params: { id: string } }) {
  const issue = useAsync(() => tracker.issue(params.id), [params.id]);
  if (!issue.data) return <Page title={params.id} loading />;
  const i = issue.data;
  return (
    <Page title={i.title} meta={i.identifier}>
      <Properties>
        <Property key="status" label="Status" value={i.status} options={STATUSES}
          onChange={async (next) => { await tracker.setStatus(i.identifier, next); issue.reload(); }} />
        <Property key="assignee" label="Assignee" value={i.assignee} />
        <Property key="cycle" label="Cycle" value="Cycle 12" href="cycles/12" />
      </Properties>
      <Markdown text={i.description} />
      <Section title="Sessions">
        <SessionList issue={i.identifier} />
      </Section>
      <TextField key={`comment-${i.comments.length}`} placeholder="Comment" submitLabel="Send"
        onSubmit={(text) => tracker.comment(i.identifier, text).then(issue.reload)} />
    </Page>
  );
}
```

On desktop, `Properties` is a right-hand column. On the phone it is a row of chips, each opening a native menu. When the user picks "In Review", the App shows the new value at once, marks the chip pending, and sends:

```json
{ "op": "event", "surface": "page:tracker-demo:issues/AU-16", "rev": 3, "eventId": 31,
  "node": "status", "event": "change", "value": "In Review" }
```

The worker runs `onChange`, re-renders, and the Engine answers with a patch that also acknowledges the event:

```json
{ "op": "patch", "surface": "page:tracker-demo:issues/AU-16", "rev": 4, "acks": [31],
  "set": {
    "status": { "type": "Property",
      "props": { "label": "Status", "value": "In Review", "options": ["Todo", "In Progress", "In Review", "Done"] },
      "events": ["change"] }
  },
  "remove": [] }
```

If the handler throws or times out, the ack carries an error. The App then reverts the chip and shows one error toast through the existing wrapper.

## A weather band shows how slots stay fenced

A slot contribution is the same machinery at a smaller size. The manifest declares the slot statically, so Argo knows where the Plugin draws, and in what order, before any code runs. The component receives a typed context for that slot. Returning `null` leaves the slot empty.

```json
{
  "id": "weather",
  "name": "Weather",
  "argoApi": 1,
  "slots": [{ "name": "composer.above", "order": 50 }],
  "settings": [{ "key": "city", "type": "string", "label": "City" }],
  "permissions": { "net": ["api.open-meteo.com"] }
}
```

```tsx
export default definePlugin({
  slots: {
    "composer.above": function Weather({ context }: SlotProps<"composer.above">) {
      const city = useSetting("city");
      const [hiddenOn, setHiddenOn] = useStorage("hiddenOn", "");
      const today = new Date().toDateString();
      const w = useAsync(() => getWeather(city), [city], { refreshEvery: "15m" });
      if (context.session.status === "running") return null;   // stay out of the way while the Agent works
      if (!city || !w.data || hiddenOn === today) return null;
      return (
        <Banner icon={{ name: w.data.icon }} title={`${w.data.temp}° in ${city}`} subtitle={w.data.summary}
          actions={[{ id: "hide", label: "Hide today", icon: "close" }]}
          onAction={() => setHiddenOn(today)} />
      );
    },
  },
});
```

```json
{ "op": "snapshot", "surface": "slot:composer.above:weather:ses_42", "rev": 1, "root": "banner",
  "nodes": { "banner": { "type": "Banner",
    "props": { "icon": { "name": "cloud-rain" }, "title": "14° in Berlin", "subtitle": "Light rain after 4 pm",
               "actions": [{ "id": "hide", "label": "Hide today", "icon": "close" }] },
    "events": ["action"] } } }
```

Mature hosts give every slot four things: a fixed context type, a size budget, a rule for ordering several contributors, and isolation when one fails. Claude Code passes each render site its own props, such as `bodyColumns` and `maxRows`. Its band above the prompt is shared by every mod as a middleware chain, and an invalid tree makes Claude Code draw its own version of the site ([Mods interface](https://code.claude.com/docs/en/plugins/mods/interface.md); [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference.md)). Shopify caps a block target at **three extensions** ([Shopify checkout UI extensions](https://shopify.dev/docs/api/checkout-ui-extensions/latest)). VS Code orders menu items with `group@order` and filters them with declarative `when` clauses, so it can hide a contribution without starting the extension ([VS Code contribution points](https://code.visualstudio.com/api/references/contribution-points)). Block Kit gives a section exactly one `accessory`, drawn from a closed list of element types ([Slack section block](https://docs.slack.dev/reference/block-kit/blocks/section-block)). That suggests each Argo slot should also allow only a subset of the vocabulary. The numbers in this table are starting proposals, not sourced values:

| Slot | Context | Allowed primitives | Budget |
|---|---|---|---|
| `composer.above` | Session id and status, Project | Banner, ListItem, Text, Badge, Button | about two rows; max 3 Plugins; Permission and Elicitation cards stay nearest the Composer |
| `inspector.panel` | selected Session, Issue or file | page vocabulary minus Page and Nav | scrolls inside the panel; bottom sheet on phone |
| `session.header.actions` | Session id and status | Button, Menu | icon buttons; extras fold into one menu |
| `project.details` | Project id | ListItem, Properties | rows in Project details |
| `*.menu` | the item the menu opened on | menu items only | item cap |

Each `<PluginSlot>` wraps each contribution in its own error boundary and fetches a tree only when the slot mounts. An empty or failed contribution draws nothing, and a fault raises one toast, never a placeholder.

## Twelve design points the evidence sharpens

### Vocabulary: generic primitives, tokens only

Two families exist. Template systems such as Raycast's `List`/`Detail`/`Form` and Block Kit's sections give authors high-level rows and no layout at all ([Raycast List](https://developers.raycast.com/api-reference/user-interface/list); [Slack blocks](https://docs.slack.dev/reference/block-kit/blocks)). Primitive systems such as DivKit, Hyperview and A2UI expose stacks and rows. The best model for "tokens only" is Adaptive Cards' **HostConfig**: a card says `"spacing": "medium"` or `"color": "attention"`, and the host decides the pixels ([HostConfig](https://learn.microsoft.com/en-us/adaptive-cards/rendering-cards/host-config)). A2UI does the same with `variant` enums ([A2UI components](https://a2ui.org/reference/components/)). DivKit and Hyperview take raw numbers and colours, which is the opposite of what Argo wants ([DivKit container](https://divkit.tech/docs/en/concepts/divs/2/div-container.md); [Hyperview styles](https://hyperview.org/docs/reference_style)). For Argo, that means mostly high-level, platform-adaptive primitives that map onto ones Argo already owns, plus one small `Stack` for the rest. There is no `className`, no `style`, no pixels and no colour values.

| Primitive | Props (data and tokens only) | Desktop / phone |
|---|---|---|
| `Page` | `title`, `meta`, `actions[]`, `loading` | pane with its own header / native stack header, actions in `headerRight` |
| `Nav` | `items[]` (label, icon, href, count) | Plugin sidebar / root screen of the Plugin stack |
| `Section` | `title`, `count`, `collapsible` | group heading / grouped card |
| `ListItem` | `icon`, `title`, `subtitle`, `meta`, `accessories[]`, `href` | one line, accessories trailing / two lines |
| `Properties`, `Property` | `label`, `value`, `options`, `href` | right column / chips that open a menu |
| `Banner` | `icon`, `title`, `subtitle`, `tone`, `actions[]` | compact strip for slots |
| `Text`, `Markdown` | `role` (title, heading, body, secondary), `tone`; restricted Markdown | same drawing, phone one type step up |
| `Badge`, `Icon`, `Avatar` | `label`, `tone`; Argo icon name (ADR-0019) | same |
| `Button`, `Menu` | `label`, `icon`, `variant` (primary, secondary, destructive) | Uniwind / native button and menu |
| `TextField`, `Toggle`, `Select` | `value`, `placeholder`, `options` | Uniwind fields / SwiftUI and Compose controls |
| `Stack` | `direction`, `gap` (none, sm, md, lg), `align` | same; no pixels |
| Embeds | `SessionList issue=`, `IssueRef id=`, `FileRef path=` | Argo components, Argo data |
| `WebView` | `src` in the Plugin folder, `fallback` | sandboxed iframe / declared native fallback |

Tones are a short enum: neutral, accent, success, warning, danger. Adaptive Cards gets by with the same idea (`good`, `warning`, `attention`). Icons are Argo icon names only, so ADR-0019's map stays the one place that knows SF and Material names. Charts and graphs are absent from every primary vocabulary read. Block Kit names a "Data visualization" block, but its structure was not retrieved. A chart would therefore be a new registered primitive with series data and tone colours, never SVG passed through.

### Composition happens in React, before the wire

Wire formats that support reuse do it in one of three ways: DivKit's templates with `$` parameters, Adaptive Cards' `$data`/`$when` expansion, or rfw's named widget libraries ([DivKit templates](https://divkit.tech/docs/en/concepts/templates); [AC templating](https://learn.microsoft.com/en-us/adaptive-cards/templating/language); [rfw](https://pub.dev/packages/rfw)). Adaptive Cards runs its expansion in the SDK, so the renderer only ever sees a plain card. Argo gets the same result for free, because author components and hooks run in the worker and dissolve into primitives. The wire needs **no templates, loops, conditions or expressions**. That matters beyond simplicity: json-render's `$cond`/`$computed` and A2UI's function calls put logic in the payload, and logic in the payload is what makes SDUI look like code to a store reviewer ([json-render](https://github.com/vercel-labs/json-render)). DivKit and rfw also show the property Argo needs: composition can never add visual capability, because everything bottoms out in built-in elements.

### State lives on the Server; feel lives in the App

The agreed closure model is right. A press runs `onPress` in the Plugin, the handler changes state, and the tree re-renders, as in Raycast and mods ("a callback changes state, and the hook renders again from the new state", [Mods interface](https://code.claude.com/docs/en/plugins/mods/interface.md)). But every system that serves a distant client adds a client-side part. LiveView's JS commands "execute directly on the client without reaching the server" ([LiveView bindings](https://phoenix-live-view.hexdocs.pm/bindings.html)). Hyperview has screen-local `show`, `hide`, `toggle` and `set-value` ([Hyperview behaviors](https://hyperview.org/docs/reference_behavior_attributes)). rfw puts local state in widgets because buttons "cannot wait for logic that's possibly running on a remote server" ([rfw README](https://github.com/flutter/packages/blob/main/packages/rfw/README.md)). Argo can avoid a client-side language altogether, because its primitives are high level. Section collapse, menu open state, a field's draft and a picker's chosen value live inside the App's primitive. Navigation and Argo's own effects (`href`, `openUrl`, `copy`, `openSession`, `insertIntoComposer`) are declared as data and run in the App at once. Only Plugin logic waits for the Server.

Forms follow LiveView's rules, which are the best documented. The client is "always the source of truth for current input values", a render never overwrites a focused field, `phx-debounce` defaults to **300 ms**, and every element that pushes an event gets a loading state until the server acknowledges it ([LiveView form bindings](https://phoenix-live-view.hexdocs.pm/form-bindings.html); [Syncing changes](https://phoenix-live-view.hexdocs.pm/syncing-changes.html)). In Argo terms: the App owns a field's live value, sends `change` (debounced) only if the Plugin listens and `submit` always, and marks the source node pending from send to ack. That way every Plugin gets pending states without writing them. Validation errors come back as part of the re-rendered tree, like Block Kit's `errors` keyed by `block_id` ([Slack modals](https://docs.slack.dev/surfaces/modals)). Each handler gets a time budget: mods allow **10 s** per hook ([Mods reference](https://code.claude.com/docs/en/plugins/mods/reference.md)), and Slack requires an ack within 3 s ([Slack interactivity](https://docs.slack.dev/interactivity/handling-user-interaction.md)). A failed or late event reverts the App's optimistic value and shows a toast.

### The wire: numbered snapshots, id-keyed patches, events back

Systems in the wild send full trees (Adaptive Cards, Block Kit), generic JSON Patch over a nested tree (Raycast, gzipped above a size threshold), mutation records (remote-dom), or template-aware diffs (LiveView) ([Raycast blog](https://www.raycast.com/blog/how-raycast-api-extensions-work); [remote-dom](https://github.com/Shopify/remote-dom); [LiveView Engine](https://phoenix-live-view.hexdocs.pm/Phoenix.LiveView.Engine.html)). The simplest fit for Argo is the flat id-keyed map that A2UI and json-render use, because a patch is then just "upsert these nodes, remove these ids", and it stays stable when rows move ([A2UI v0.9](https://a2ui.org/specification/v0.9-a2ui/)). One tRPC subscription per surface carries `snapshot` and `patch` messages, and one mutation carries `event`. Every message has a `rev`. The App drops anything older than its tree and asks for a snapshot after a gap. Block Kit's `hash` exists for the same stale-update problem. On reconnect, the Server sends a fresh snapshot and patches resume; LiveView recovers the same way, by re-mounting and having forms resend their values ([LiveView deployments](https://phoenix-live-view.hexdocs.pm/deployments.html)). Re-renders are coalesced, as mods throttle redraws to **10 per second** and show only the latest value ([Mods interface](https://code.claude.com/docs/en/plugins/mods/interface.md)). How tRPC's own subscription resume (`tracked()` event ids) fits this scheme was not researched.

### Navigation: one Plugin path is one native stack entry

Hyperview is the closest precedent. It builds on React Navigation, and its verbs are `push`, `new` (modal), `back`, `close` and `navigate`. Whether a screen is a modal is a property of the route (`modal="true"`), not of each link ([Hyperview navigation](https://hyperview.org/docs/guide_navigation); [Hyperview behaviors](https://hyperview.org/docs/reference_behavior_attributes)). Raycast uses plain `push`/`pop`, and ESC pops automatically ([Raycast navigation](https://developers.raycast.com/api-reference/user-interface/navigation)). For Argo, `href="issues/AU-16"` becomes `router.push("/plugins/tracker-demo/issues/AU-16")`. The catch-all hands the screen `path: string[]` ([Expo URL parameters](https://docs.expo.dev/router/reference/url-parameters/)). The screen subscribes to the surface for `(pluginId, path)` and treats `path` as untrusted input. Expo remounts a route when its params change, so the surface should be keyed by Plugin id plus path (paraphrased from a fetch summary of the same page).

Expo declares `presentation` per `Stack.Screen` in the layout, and no source showed it changing at runtime ([Expo modals](https://docs.expo.dev/router/advanced/modals/)). `presentation: "sheet"` therefore needs a sibling route, such as `(shell)/plugin-sheet/[pluginId]/[...path].tsx` with `formSheet`. The route name is a suggestion, and runtime presentation should be checked against the installed SDK. On Android a formSheet cannot show a native header, so sheets draw their title in their content. Headers come from the `Page` node through `<Stack.Screen options={{ title, headerRight }} />`, which matches Argo's plain single-line native headers. The alpha `Stack.Toolbar` API is best avoided ([Expo Stack](https://docs.expo.dev/router/advanced/stack/)). Deep links need one more rule. Hyperview requires a deep link to spell out the full hierarchy, so every Plugin path must identify its page on its own. That is why Plugins declare routes (`issues/:id`) rather than pushing anonymous screens.

### Versioning: negotiate once, fall back per node

Adaptive Cards has the most complete in-document scheme. Each card has a `version`, and each element can carry `requires` and a `fallback`, which is another element or `"drop"` ([Universal Action Model](https://learn.microsoft.com/en-us/adaptive-cards/authoring-cards/universal-action-model)). That `drop` "doesn't bubble up any higher" is known only from search snippets of the Schema Explorer. The same page shows the cost: authors write `Action.Execute` with an `Action.Submit` fallback inside an `ActionSet`, and older clients get a degraded experience. A2UI negotiates once per surface: the client advertises `supportedCatalogIds`, and the catalog is fixed for the surface's lifetime ([A2UI catalogs](https://a2ui.org/concepts/catalogs/)). A2UI also renamed properties between v0.8 and v0.9, which shows how early catalogs break. Argo can combine the two. A manifest declares `argoApi: 1`. Each Connection reports its App's catalog version. The Server resolves per-node `fallback` props before sending, for example `<Chart fallback={<Text>…</Text>}/>`. If something unknown still reaches the App, an unknown leaf is dropped, and an unknown container replaces the surface with "Update Argo to see this", much as Claude Code draws its own version of a refused site. After 1.0, changes should be additive only, with stable enum values. Argo has one advantage Teams and Shopify lack: the Server sits between every Plugin and every App, so it can adapt the tree to each phone before sending.

### Validation and security: check twice, trust honestly

Zod 4 has what the schema needs: `z.discriminatedUnion("type", …)` for fast dispatch, getters for recursion, `z.strictObject` to reject unknown props, `.max()` on strings and arrays, and `z.httpUrl()` ([Zod API](https://zod.dev/api)). Zod has no depth or node-count limit, so a pre-walk enforces caps (depth, node count, string bytes, payload bytes) before parsing. Block Kit shows the kind of numbers platforms set: **50 blocks per message, 100 in modals**, and 3,000 characters per text ([Slack blocks](https://docs.slack.dev/reference/block-kit/blocks)). The Server validates strictly and reports a path-addressed error, A2UI's `VALIDATION_FAILED {surfaceId, path, message}` pattern ([A2UI v0.9](https://a2ui.org/specification/v0.9-a2ui/)). The App renders tolerantly. URLs must be https and on hosts the manifest declares. Images go through the Server's blob route. `href` can only name Plugin paths or Argo routes.

The JSON tree is safe by construction: the phone executes nothing, and the catalog limits what can be drawn. The Plugin code is not safe. Node's permission model "does not provide security guarantees in the presence of malicious code" ([Node permissions](https://nodejs.org/api/permissions.html)). isolated-vm warns that it does not make untrusted code safe, and it is in maintenance mode ([isolated-vm](https://github.com/laverdet/isolated-vm)). Claude Code says plainly that "Mods aren't sandboxed" ([Mods admin](https://code.claude.com/docs/en/plugins/mods/admin)). The honest model is Claude Code's. A Plugin is trusted local code. A static check lists what it touches (network hosts, settings, storage, slots), and the user approves that list before the Plugin is enabled, and again when the code or the list changes. Embeds add a useful property: `<SessionList issue="AU-16"/>` lets a Plugin show Sessions without being able to read them, because the App fetches that data under the Connection's own rights. This is an inference, but it suggests a cheap permission tier.

### Runtime: one supervised plugin process, one worker per Plugin

Raycast runs one child Node process with each extension in its own worker thread, its own event loop and limited heap, talking over a thin RPC with a fixed message set ([Raycast security](https://developers.raycast.com/information/security)). That shape suits Argo. Node's `worker_threads` give per-worker `resourceLimits`, `terminate()` for timeouts, and an `env` option, so a Plugin need not inherit the Server's environment. But hitting a global OOM can still abort the whole process ([Node worker_threads](https://nodejs.org/api/worker_threads.html)). The workers should therefore live in a separate plugin process under the Supervisor, not inside the Engine. A runaway Plugin can then only take down other Plugins. Workers start on first use, as VS Code's activation events do ([VS Code activation events](https://code.visualstudio.com/api/references/activation-events)). They restart on crash up to a cap, like Claude Code's LSP `restartOnCrash` and `maxRestarts` ([Plugin reference](https://code.claude.com/docs/en/plugins-reference)). Running the plugin process with `--permission` and file access limited to the Plugin and data folders is a cheap guard against accidents. It is not a sandbox. Note that a Worker given an explicit `execArgv` can drop the parent's grants. The new process needs a name in `GLOSSARY.md`.

### Storage: per-Plugin key-value through the Writer, secrets elsewhere

Every reference platform gives each extension a private key-value store and pushes large data to a folder. None publishes numeric quotas. VS Code has `workspaceState`, `globalState`, storage folders and a separate encrypted `secrets` store ([VS Code capabilities](https://code.visualstudio.com/api/extension-capabilities/common-capabilities)). Raycast's `LocalStorage` is encrypted, per extension, and "not meant to store large amounts of data" ([Raycast storage](https://developers.raycast.com/api-reference/storage)). Claude Code keeps plugin data in a directory that survives updates and stores sensitive config in the OS credential store ([Plugin reference](https://code.claude.com/docs/en/plugins-reference)). For Argo, `useStorage(key, default)` is scoped to the Server, Project or Session and backed by a `plugin_kv` table. Every write goes through the existing Writer, so writes are transactional and Writer commit notifications keep App queries fresh. Argo sets its own quotas. Secret settings go to the OS credential store, files go to a per-Plugin data folder, and uninstall deletes all three unless the user keeps the data.

### Mobile performance: structure beats tuning

No primary source publishes a benchmark for drawing server-driven trees in React Native. DivKit's claims are qualitative. Third-party notes put the point where `JSON.parse` breaks at hundreds of megabytes, far beyond any UI tree (HackerNoon, search summary only). The reliable levers are therefore structural. Node ids double as React keys. The App renders one memoised component per node, and applying a patch replaces only the changed nodes, so untouched subtrees skip re-rendering. Any `Section` or list with many children is virtualised with the list primitive Argo already uses (LegendList), and Raycast-style `hasMore` lets it page ([Raycast List](https://developers.raycast.com/api-reference/user-interface/list)). The rest is caps and rate limits. Shopify enforces a **64 KB gzip** bundle budget and rate-limits extensions that change the UI too often ([Shopify checkout UI extensions](https://shopify.dev/docs/api/checkout-ui-extensions/latest)). Argo's equivalents are a payload cap per tree, coalesced renders, and a per-Plugin event rate. Shopify's migration is a useful caution: transfer sizes fell 40–85%, but load time improved only about 8% ([Shopify Engineering](https://shopify.engineering/upgrading-checkout-blocks-app-to-polaris-web-components)). Measure on a low-end Android release build before tuning anything. That migration also removed a ~89 KB React reconciler from a client bundle. Argo's reconciler runs on the Server, so that cost does not apply here.

### Testing and Storybook: one fixture folder feeds everything

No SDUI team's testing write-up was retrievable at primary-source level. The pieces still fit together cleanly with ADR-0021, because the App-side renderer is a view that takes a tree as props. The Zod schema is the single source for TypeScript types, a JSON Schema and the docs, and a CI check fails when the generated files drift, as the small Mosaic SDUI project does ([mosaic contracts](https://pkg.go.dev/github.com/mosaic-media/contracts@v0.59.0)). A folder of wire fixtures (valid, invalid, oversized, too deep, newer than the App) is shared by three consumers: Server tests check that Plugin output validates, App tests check that every fixture renders or degrades, and Storybook gives each fixture a story, showing the desktop and phone drawing side by side. Frozen fixtures per `argoApi` version keep old Plugins rendering. For Plugin authors, a harness runs the Plugin headless in the real worker and presses controls by node id. The mods docs describe the same idea: a test command with "no session, sign-in, or network" that presses controls by `key` ([Create a mod](https://code.claude.com/docs/en/plugins/mods/create)). One researcher did not find that command in the general plugin reference, so its exact name should be checked. App E2E (ADR-0018) needs only one sample Plugin to prove the wiring.

### Authoring by an Agent: copy the mods loop

Claude Code is the precedent for an Agent writing code that emits UI trees, as opposed to emitting trees itself. It writes a generated `.d.ts` for the installed version and tells the Agent to "trust these files over any page". A built-in `plugin-authoring` skill guides the work. `claude plugin validate` analyses the code statically, lists the hooks and API calls it uses, and rejects patterns it cannot read. Claude-written mods hot-reload at the end of each turn once the user approves. An invalid tree is refused with a line that names the bad prop, such as `Text prop "bogusProp" is not allowed` ([Create a mod](https://code.claude.com/docs/en/plugins/mods/create); [Mods interface](https://code.claude.com/docs/en/plugins/mods/interface.md)). Argo's loop works the same way. The Agent in a Session loads an Argo authoring skill, reads types generated from the same Zod schema, writes into a dev folder the Server watches, and calls `validate` and `test`, which the Server exposes to Sessions as MCP tools. The Plugin then appears live in the user's App, and the user enables it after reading the capability list. json-render adds one useful idea: each catalog entry carries a description, and the Agent prompt is generated from the catalog, so docs cannot drift from the schema ([json-render](https://github.com/vercel-labs/json-render)). Constrained decoding is not needed here, because the Agent writes TSX, not JSON. It would also struggle: Anthropic's structured outputs do not support recursive schemas ([Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)). If Agents ever emit trees directly into the Feed at runtime, the flat id map is the shape that suits it.

## Prior art, condensed: everyone native ends up with a closed catalog

| System | What it is | What Argo takes or leaves |
|---|---|---|
| Raycast | React in a Node worker → custom reconciler → JSON tree → JSON Patch → AppKit | Take the whole pipeline; Raycast is local, so add the network refinements |
| Claude Code mods | Code returns element trees per render site; closures, `invalidate`, 10/s redraw | Take sites with typed props, refusal with exact error, types, validate, hot reload, approval |
| Shopify remote-dom | Sandboxed worker mirrors allow-listed elements to the host | Take allow-list and three-per-target cap; dropped its 89 KB client reconciler |
| Adaptive Cards | JSON cards, HostConfig, `requires`/`fallback`, `Action.Execute` | Take tokens via HostConfig and per-node fallback; avoid per-card version tables |
| Slack Block Kit | High-level blocks, one accessory, hard limits, 3 s ack, `hash` | Take one-trailing-slot rule, numeric caps, stale-update guard |
| A2UI | Flat id-keyed components, catalog negotiation, `VALIDATION_FAILED` | Take flat map and path errors; native renderers still only planned |
| json-render | Zod catalog + registry, React Native renderer, `$state` expressions | Take catalog-generated docs; leave the expression language |
| Hyperview | XML screens on React Navigation; push/new/back/close; local show/hide | Take route-level modals and full-path deep links; leave raw style values |
| DivKit, rfw | Templates and widget libraries over built-in elements | Confirm "composition cannot add capability"; rfw shows local state for latency |
| LiveView | Server state, diffs, client-owned inputs, loading states, 300 ms debounce | Take the form and pending rules; LiveView Native was archived on 10 Feb 2026 |
| Airbnb Ghost, Nubank BDC | Sections, screens and actions from a backend; layout per form factor | Validates adaptive primitives at scale; sources are secondary (see below) |
| MCP Apps, OpenAI Apps SDK | HTML in a sandboxed iframe, JSON-RPC over `postMessage` | Leave for native UI; a model for the WebView escape hatch |
| RSC, Expo RSC | Server renders React; Client Components must be in the bundle | Same idea as the registry; Expo RSC is beta and not for production |

Three entries need more than a row. **MCP Apps** became a stable extension on 2026-01-26. A tool points at a `ui://` HTML resource that the host renders in a sandboxed iframe with CSP `default-src 'none'`, and the spec "has no dedicated mobile or native section" ([MCP Apps spec](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)). OpenAI's Apps SDK now "implements the open MCP Apps standard" ([OpenAI Apps SDK](https://developers.openai.com/apps-sdk/build/chatgpt-ui)). That rules it out as Argo's main path, because it bypasses Argo's primitives on the phone. It makes a good shape for the `WebView` escape hatch, though. If Argo's web view spoke MCP Apps, a tool UI built for Claude or ChatGPT could also run in Argo on desktop. That is an inference, not a tested claim. **React Server Components** look closest on paper: the server renders, and interactive components must already be in the client bundle, just like Argo's registry. But Server Components "cannot use interactive APIs like `useState`", functions cannot cross the boundary, and the model is request and response, not a long-lived push ([React RSC](https://react.dev/reference/rsc/server-components)). Expo's RSC is "experimentally available", lacks EAS Update support, and production use is "not recommended yet" ([Expo RSC](https://docs.expo.dev/guides/server-components/)). Take the concept, not the dependency. **Airbnb and Nubank** confirm that adaptive, design-system-owned building blocks scale. Airbnb's Ghost Platform sends sections, screens and actions, with layouts per form factor ([InfoQ](https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/)). Nubank describes its blocks as a "Lego manual" that complies with its design system ([Nubank](https://building.nu.com/server-driven-ui-framework-at-nubank/)).

Several claims rest on search summaries rather than fetched pages. Airbnb's original Medium post returned 403, so only InfoQ's account was read. Nubank's "over half the app, 1,000+ screens" comes from a QCon abstract snippet ([QCon London 2025](https://qconlondon.com/presentation/apr2025/mobile-server-driven-ui-scale)). The Adaptive Cards `drop` semantics come from Schema Explorer snippets. The LiveView Native navigation details come from a summary of old v0.3.0 docs. The Wix slot behaviour and Shopify's rate-limit wording come from summaries. FlashList guidance was read only from mirrors, LegendList's speed claims are self-reported, and the `JSON.parse` limit comes from a HackerNoon summary.

## Open questions for #506

**Who grows the vocabulary, and how fast?** Shopify's developers called its closed set "incomplete" soon after launch ([InfoQ](https://www.infoq.com/news/2026/10/shopify-web-components)), so Argo needs a quick path from "a Plugin needs X" to "the catalog has X". It also needs to decide whether `Stack` ships in version 1 or waits for a real need.

**Are navigation and Argo actions data-only, or also callable from handlers?** `href` covers taps. A handler that navigates after an async save (create an Issue, then open it) needs a `navigate` command sent back from the Server. Is that allowed, and does the App honour it only while the surface is focused?

**Who orders a crowded slot?** The options are a fixed `order` from manifests, user ordering in Settings, or Shopify-style placement. The cap and height budget for `composer.above` also need numbers. Do they stay fixed, or come from Paper designs?

**Do embeds need permissions?** If `SessionList` runs under the Connection's rights, a Plugin can show data it cannot read. Is that the intended tier, or should embeds also be declared in the manifest?

**What does the phone draw for a WebView?** A declared native fallback, or an MCP Apps-compatible web view under Apple guideline 4.7? Is MCP Apps compatibility worth designing for at all?

**One process or many?** One plugin process with a worker per Plugin is Raycast's cost/benefit choice. A child process per Plugin contains crashes better. Pick one before the protocol is fixed.

**Is runtime generative UI in scope?** A2UI-style trees emitted by an Agent straight into the Feed would reuse the catalog but skip the Plugin code. Decide whether that is the same catalog, a subset, or out of scope.

**What still needs verifying?** Whether Expo Router can change `presentation` at runtime. How tRPC subscription resume interacts with `rev`. How Raycast routes events back to the worker (its blog is silent). Real numbers for tree caps, from a benchmark on a low-end Android release build.

## Conclusion

The agreed design is Raycast and Claude Code mods moved across a network. That network, more than anything about React or JSON, decides the remaining choices. Because a paired phone may be a relay hop away, the closure model alone feels slow. The fix is not a client-side scripting language, which is the path Hyperview, DivKit and json-render took. The fix is high-level primitives that already own their ephemeral state, plus declarative `href`s and Argo actions. The coarser and more adaptive the vocabulary, the less logic must cross the wire. That keeps the payload plain data for app reviewers, short for Agents to write, and native on every platform without Plugin authors knowing which platform they are on.

The second takeaway is that the Server in the middle is Argo's structural advantage. Teams, Shopify and Slack must ship one payload to clients of unknown age. Argo's Server knows each Connection's catalog version, can resolve fallbacks before sending, can validate and report errors to the Agent that wrote the Plugin, and can keep secrets and network access away from the phone entirely. Most of what other platforms solve with versioned schemas, sandboxes and review queues, Argo can solve in one Engine module that validates, adapts and diffs.
