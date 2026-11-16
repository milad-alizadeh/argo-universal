# Plugin designs are drawn live in the App as Drafts with Variants

A Plugin author could not see a design before it was built: the test kit returns trees, Paper is Argo's internal tool, and every undrawn state became a question in chat. #2231 first proposed `argo-plugin preview`, a static gallery of recorded trees drawn by the web renderer. The owner chose instead to draw the design where it will live (owner, 2026-11-15): a dev Plugin page drawn from canned data, a Draft, appears in the running App on every platform, with the real kit components, and its author switches between Variants there. This builds on [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md)'s dev reload and [ADR-0050](0050-plugin-pages-are-a-loader-and-a-pure-render.md)'s Loader pages, and copies Paper's way of drawing: one region at a time, each fading in where the author can watch.

## Decision

- **A Draft is a Loader page whose Loader answers canned data.** It draws every state of the minimum set (loading, empty, error, signed out or refused, pending, populated), and `argo plugin validate` lists the ones a Draft page is missing. A Draft Loader may not call `argo` reads or real Operations, even in a Plugin whose real pages hold Capabilities ([ADR-0030](0030-plugins-get-only-the-capabilities-their-manifest-declares.md)); `validate` refuses one that does.
- **Pages and Workbench card pages can be drafted.** Items Slots cannot, since Argo draws their rows; Replaceable Slots cannot yet, since a design there is a core-screen decision.
- **Variants are declared per region and picked in the App.** A dev-only manifest key names each region's Variants. The pick is part of the Page address while the Draft is open, kept by each App on its own and never synced. Variants must differ in structure; the Draft protocol states the rule and the author judges it.
- **Draft tooling is App UI for dev Plugins only, told apart by place, not colour.** A tag on each region steps its Variants; a floating bar at the bottom, marked by an amber Draft badge, steps the states (one native menu on phones), turns on comment mode and sends the pick. The tooling stays in Argo's light kit: inverting it was tried and rejected as too loud.
- **The author can comment on any node.** In comment mode the author selects a node of the Plugin tree and writes a note; it names the node by its key and the region and Variant it sits in, so the Agent knows exactly what is meant.
- **The Agent draws a Draft region by region.** It writes a keyed skeleton first, then fills one region at a time and calls the core Operation `plugin.draft.show` after each. That rebuilds the Plugin at once and swaps its worker only when the build passes, the one exception to deferring rebuilds while a Turn runs. The App frames the region being written with a labelled outline, then fades in the nodes whose keys are new since the tree it kept and dissolves the frame; nothing changes on the Plugin wire.
- **A pick reaches the Plugin through the Agent.** Choosing in the App calls a core Operation that records the pick, one per region so parts of several Variants mix, with every comment, and hands them to the Session's Agent, which writes the chosen-variant file into the Plugin folder. A Plugin never writes its own code folder (ADR-0030), and Agents change code. The Agent reads the pick and comments back with `argo run`.
- **Drafts never ship.** The Agent builds the real page from the chosen-variant file and deletes the rest; `validate` fails while a Variant declaration remains.
- **The Draft protocol lives in `plugin.guide`.** The blueprint gains a step: draw a Draft and have it chosen before writing real data code. It is written for the Agent of an Argo Session; a terminal agent may run the same Operations with `argo run`, unpromised.

## Considered options

- **A static gallery (`argo-plugin preview`),** as #2231 first proposed. Rejected: a second renderer on the web only, no native pixels, and a separate place to look. Its one gain, a folder to share without Argo running, is not worth that.
- **Plugin-drawn switchers.** Rejected: the switcher would sit inside the Variants it switches.
- **Exempting Draft edits from the Turn's rebuild deferral.** Rejected: a rebuild swaps the whole worker, so the Plugin's real Operations would reload mid-Turn too. The Agent choosing the moment keeps half-written files out.
- **A Plugin Operation that writes the chosen-variant file.** Rejected by ADR-0030.

## Consequences

- The Agent sees no pixels in this design; it checks trees through `validate`, and the author judges how a Draft looks. Letting the Agent capture what the App draws, Paper's screenshot-and-critique loop, is a later spec.
- The Draft bar, region tags, comment popover and the drawing frame are new Argo UI, designed in Paper (page "Plugin Drafts · #2231") before they are built.
