# The Feed draws Mermaid fences as diagrams

Agents write ` ```mermaid ` fences to explain control flow, and the Feed showed them as code (owner, 2026-11-15). This ADR records how Argo draws them on every App, and how Agents learn to write fences it can draw. It adds a second source of drawn SVG beside [ADR-0028](0028-plugins-draw-svg-charts-and-canvases-on-every-app.md)'s Plugin `Svg`.

## Decision

- **Every Markdown surface draws a Mermaid fence.** The kit's Markdown hands a fence whose language is `mermaid` to a kit `Diagram`, so Feed messages, written Plans and any other Markdown draw it. `Diagram` is App-only: a Plugin sends the Markdown or an `Svg`.
- **`beautiful-mermaid` draws it, in the App.** It turns Mermaid into an SVG string with no DOM, so the Apps draw it with `react-native-svg`'s `SvgXml` on iOS, Android, web and desktop, with no web view. It draws offline, from any Feed row, with no Server round-trip.
  - It draws `flowchart`/`graph`, `stateDiagram`, `sequenceDiagram`, `classDiagram` and `erDiagram`. Every other kind, `xychart` included (its colours are CSS classes a native SVG cannot read), shows its code.
  - The shared module is `@repo/contracts/kit-diagram`. It is pure TypeScript, so both the kit and the Server import it, and the kit's import allowlist names it, as it names `kit-tokens`.
  - Argo reads front matter (`title:`) itself, writes a direction on a bare `flowchart`, and spaces arrows written without spaces (`A-->B`), all of which the renderer misreads.
- **Colours are Argo's tokens.** The drawing is plain SVG: the renderer's `<style>`, its CSS variables, `color-mix()` and its Google Fonts `@import` are removed, and every variable becomes a resolved theme token. Nothing in a diagram fetches a URL.
  - Colours the Agent sets (`style`, `classDef`, `linkStyle`, `%%{init}%%`) are dropped.
  - A flowchart node may take a tone by class: `class A success`. The tones are `info`, `success`, `warning`, `danger`, `done` and `muted`. The tone's 100 shade fills the node, its 500 outlines it and its 900 writes on it; dark mode reverses the ramp ([ADR-0026](0026-the-ui-kit-names-its-tokens-by-role.md)). Any other class draws neutral.
  - Each diagram's marker ids are scoped by a hash of its source, since every diagram on a web page shares one document.
- **The block is a code block.** It keeps the header every code block has (title, Copy), titled with the front-matter title, else the kind. A switch in the header shows the drawing or its code; Copy copies the source.
  - The drawing fits the column width, never larger than drawn and at most 480 points tall. A press opens it full screen over the whole window, where it pans and zooms with the kit Canvas's camera; a double tap or Fit fits it again.
  - While the fence streams, a 16:9 Skeleton stands in. The drawing waits for the closing marker, since laying out a half-written graph on each token would flicker.
  - A fence Argo cannot draw shows its code with "Couldn't draw this diagram" in the header and no switch.
  - Screen readers hear one button named for the kind and title ("Flowchart: Request flow"); the code is its text version.
- **Agents check a fence before sending it.** The `diagram.validate` Operation, at the `read` tier, runs the renderer the Apps draw with. It answers valid, or the problems with their fence line numbers and the kinds Argo draws. A third Argo instruction ([ADR-0053](0053-core-gives-every-session-argo-instructions.md)), **Diagrams**, asks the Agent to run it on every fence and fix what it reports.
  - The renderer skips lines it cannot read rather than failing, so the check also renders each line of a flowchart, state or sequence diagram alone and reports a line that draws nothing.
  - An Agent without Agent access, or one that skips the check, can still send a fence Argo cannot draw; the Apps then show its code.

## Considered options

- **Official `mermaid` in an Expo DOM component.** Rejected: every diagram kind, but a web view per diagram on the phones, and sizing a web view in a long Feed is awkward.
- **The Server renders the SVG and sends it with the Feed.** Rejected: it adds to the Feed's wire, and old rows and offline Apps could not draw.
- **A dedicated drawing tool the Agent calls.** Rejected: the diagram would be a Tool call rather than part of the message, Plans would miss it, and ADR-0044 keeps Argo's MCP tools at two.
- **Agent colours as given.** Rejected for the same reason as ADR-0028's colour rule: diagrams look like Argo, in light and dark mode.
