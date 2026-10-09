# Reusable components in Paper before Paper ships components

Researched 2026-10-09 against Paper Desktop 0.5.15 and its MCP server `paper-desktop` 0.0.1 (36 tools), read through `~/.paper/bin/paper mcp`. The question: how to keep many screens and component boards consistent while Paper has no component instances, given the workaround in [`docs/agents/paper.md`](../agents/paper.md) (masters on `Components / <Name>` artboards, copies made with `duplicate_nodes`, layer name as the link, manual re-clone and drift audit).

Labels used below: **Paper team** means a first-party Paper source. **User** means a Paper customer's repo, post or article. **Measured** means I ran it read-only against our Argo file today; nothing in the file was changed. **Inference** means my own reasoning, not a sourced fact.

## What Paper ships today

### Components: not shipped, no date

- Paper team: the public roadmap lists "Components with slots" as **coming soon**: "A component system reimagined for today's needs, aligned with code concepts, including support for props and slots". "Use your code components" is **in progress** ("No need to maintain two design systems"), and "Icon packs, shadcn, component kits" (built with Base UI) is **coming soon**. No dates are given. [Paper roadmap](https://paper.design/roadmap)
- Paper team: the September 2026 build log puts "Components" under "Coming soon", next to Remote MCP, rich text editing, a scale tool and per-file permissions. [Build log, September 2026](https://paper.design/build-log#september-2026)
- A summary of Stephen Haney's Y Combinator interview (Aug 2026) says Paper is "focused on building out essential features like components and comments". That is a third-party AI summary, not a transcript. [Summify summary of "How To Design In The Agent Era"](https://summify.io/discover/how-to-design-in-the-agent-era-P06Rgn)
- Reviewers agree that Paper has no component system or shared libraries yet. [Kombai](https://kombai.com/blog/paper-design-alternatives/) (a competitor), [UX Magic, Sep 2026](https://uxmagic.ai/blog/paper-design-review), [designproject.io, Jul 2026](https://designproject.io/blog/paper-ai-design-workflow/)
- Could not confirm: when components ship, and whether they will ship with a way to convert existing frames into components. Paper's X account and Discord are not readable without a login. A search snippet says Haney reposted a tutorial and said components are coming, but I could not open it or date it. [Stephen Haney on X](https://x.com/stephenhaney)

### Tokens: the one feature that propagates

- Paper team: tokens are CSS variables scoped to a file. "When you update a token, everything using it updates automatically." Types are colour, radius, spacing, container, breakpoint, font family, weight, size, line height and letter spacing. There are no modes (dark mode is on the roadmap). Tokens copied to another file "will not update if changed in a different file." [Tokens and themes](https://paper.design/docs/tokens)
- Paper team: tokens can be created through the MCP from a codebase's CSS variables (June 2026), created in the app (August 2026), and copied between files with Theme > Copy/Paste theme. [Build log](https://paper.design/build-log#june-2026)
- MCP: `get_tokens` returns JSON, a `:root` block or a Tailwind v4 `@theme` block. `create_tokens` and `set_tokens` create, rename, re-value, alias and delete tokens. Each tool result carries a `contentHash` of the file's tokens, so an agent can tell that someone edited tokens since it last read them. [Paper MCP guide](https://app.paper.design/mcp/desktop/config.json) (the guide is also served by the `get_guide` tool)

### Copies: deep and unlinked

- `duplicate_nodes` makes "a deep clone of each node (including all descendants)" into any parent, and returns a `descendantIdMap` from every source descendant to its clone. There is no link back to the source. [MCP tool list](https://app.paper.design/mcp/desktop/config.json)
- `write_html` accepts `<x-paper-clone node-id="…" style="…" />` to clone an existing node inline. Its own description says "Prefer cloning instead of remaking existing Paper nodes." It also accepts a `layer-name` attribute and a `replace` mode that swaps a target node for new HTML. [MCP tool list](https://app.paper.design/mcp/desktop/config.json)
- No tool or feature syncs a copy with its source, detaches it, or lists copies of a node.

### The rest of the MCP surface that matters here

All from the tool schemas, checked with `tools/list` on the local server ([public copy](https://app.paper.design/mcp/desktop/config.json)):

| Need | Tool | Limits |
| --- | --- | --- |
| Index every layer by name | `get_tree_summary` (name, type, id, size; depth up to 10), `get_children` | No search by layer name |
| Compare structure and styles | `get_jsx` (`tailwind` or `inline-styles`), `get_computed_styles` (batched) | Measured: `get_jsx` output has no layer names and no node ids |
| Find token misuse | `find_nodes` by computed style or text, file-wide, wildcards, literal colours match token-bound uses | Searches styles and text, not names |
| Hidden state | `get_node_info` returns `isVisible` | No tool shows or hides a layer |
| Bulk edits | `update_styles` (many node ids per update), `set_text_content` (batched), `rename_nodes`, `move_nodes`, `delete_nodes` | `rename_nodes` cuts names at 50 characters |
| Release the canvas | `finish_working_on_nodes` | Must be called after writes |

### Access and cost

- The Paper CLI is a stdio relay: `paper mcp` ("Start the MCP stdio relay"). Measured: a plain JSON-RPC client (no LLM) can initialise it, list tools, and call `get_basic_info`, `get_tree_summary`, `get_jsx`, `get_node_info` and `get_computed_styles`.
- User: the desktop app also serves `http://127.0.0.1:29979/mcp`, only while a document is open. [ksallee/sg-groundtruth](https://github.com/ksallee/sg-groundtruth/blob/main/docs/design-process.md), [tdimino/claude-code-minoan](https://github.com/tdimino/claude-code-minoan/blob/main/skills/design-media/paper-design/references/workflow-patterns.md)
- User, from reverse engineering: tools run inside an open editor tab and act on its in-memory document. `duplicate_nodes`, `write_html` and screenshots need the real editor; `get_jsx` and `get_computed_styles` are built from the node model. 31 of 34 tools count against a weekly MCP balance. [LunarHUE/headless-paper research summary, 2026-09-23](https://github.com/LunarHUE/headless-paper/blob/main/research/notes/00-summary.md)
- Paper team: Free allows 100 MCP tool calls a week and Pro allows 1M. [Pricing](https://paper.design/pricing) Could not confirm which plan this team is on. A scripted audit needs Pro.

### Code into Paper

- Paper team: Paper Snapshot "copies a webpage into Paper as editable layers" (April 2026). Localhost pages need CORS that allows `https://app.paper.design`. Paper also pastes HTML and Figma. [Build log](https://paper.design/build-log), [Snapshot with local images](https://paper.design/docs/support/snapshot-local-images), [Paste](https://paper.design/docs/paste)
- Paper team: the official agent plugin has a "code-to-design" use that reads "your codebase (tokens, styles, components) as context to generate new designs". That generates new HTML; it does not place live code components. [paper-design/agent-plugins](https://github.com/paper-design/agent-plugins/blob/main/plugins/paper-desktop/README.md)
- Nothing places a React component on the canvas as a linked component today. That is the in-progress "Use your code components" roadmap item.

## What Paper users do meanwhile

No Paper team post recommends a workaround for missing components. Everything here comes from users.

- **One master, many copies, then text.** Tommy Lower's agent practice file for Paper: "clone, don't retype". He reports building 16 screens from one desktop shell with `x-paper-clone` and `set_text_content`. [tommylower/cortex, `paper.md`](https://github.com/tommylower/cortex/blob/main/design/workflows/studio/practices/paper.md) Others duplicate one card instead of building three. [balarabetahir](https://github.com/balarabetahir/-Bidirectional-Design-to-Code-via-Paper-and-Claude-MCP), [SamsShow/deckle-paper](https://github.com/SamsShow/deckle-paper/blob/main/references/paper-workflow.md)
- **Clone gotchas.** The same cortex file records several failures that still report success. They matter for any re-clone routine:
  - `x-paper-clone` "shallow-clones a multi-child flex row, and only the first cell survives"; deep-copy composites with `duplicate_nodes`.
  - Clones placed in a different parent land at the parent's origin or at stale offsets, so set `left` and `top` explicitly.
  - A hug-width clone placed in a flex-column parent stretches to full width.
  - A cloned frame carrying `flex: 1` ignores later flex and width updates. Replace the frame with `write_html` instead.
  - `duplicate_nodes` cannot copy between files.
- **Tokens as the consistency lever, code as the source.** Kevin Sallee's project ships `tokens.css`. It loads those tokens into Paper, tweaks them in the Theme tab, and pastes them back. It names the main drift risk: "an artboard that stopped reading a token and holds a literal instead". It checks by changing one token and confirming every artboard moved, by comparing `get_computed_styles` with the running page, and by putting a Paper screenshot beside a Playwright screenshot. It also notes that a header copied with `x-paper-clone` "has to be made twice" when it changes. [ksallee/sg-groundtruth, `design-process.md`](https://github.com/ksallee/sg-groundtruth/blob/main/docs/design-process.md)
- **Scripts that poll the MCP.** A Paper skill describes a Node watcher that polls `get_jsx` on known artboards and hashes the output to detect edits, then runs an agent to sync code. [tdimino/claude-code-minoan, workflow patterns](https://github.com/tdimino/claude-code-minoan/blob/main/skills/design-media/paper-design/references/workflow-patterns.md) This is the closest public precedent for a scripted drift audit. I found no public script that diffs copies against masters.
- **Code as the source of truth.** Paper's own launch post quotes users who want to "treat the codebase as the single source of truth" and "zero drift between the two". [Paper blog, Feb 2026](https://paper.design/blog/a-real-space-to-design-in-the-age-of-agents) One practitioner found that working from the repository "exposed inconsistencies that a screenshot would hide". She also warns that Paper's "component system is still maturing". [Dianne Alter, designproject.io](https://designproject.io/blog/paper-ai-design-workflow/)

## Lessons from other tools

- **Sketch before and after Symbols.** Sketch 3.0 (2014) added Symbols. Sketch 3.7 (April 2016) moved masters onto "their own dedicated page" and made each instance a single layer that mirrors its master, which ended accidental edits to copies. [Sketch blog, 3.7 and new Symbols](https://sketch.com/blog/sketch-3-7-and-new-symbols) Our masters already sit in one central place. What we lack is the mirroring, and with it any protection against edits to copies. Inference: until Paper ships instances, any copy can be edited, so the defence has to be detection (an audit) and cheap regeneration, not prevention.
- **Code leads, design follows.** Brad Frost calls a design library "a promise of what's in code", a representation of the coded system. [Syntax #682, Oct 2023](https://syntax.fm/show/682/design-systems-with-brad-frost/transcript) Story.to.design builds a Figma library from Storybook stories and reports when the code changes. [‹div›RIOTS](https://divriots.com/blog/announcing-story-to-design) The pattern is to generate design copies from code rather than keep two hand-made versions. This is the opposite of our current rule that "Paper leads how things look" ([`docs/agents/paper.md`](../agents/paper.md)). No ADR covers this. Changing it is a product decision.

## Measured in our file

- The Argo file has 8 pages and about 46,400 nodes. Session alone has about 21,000. One `get_tree_summary` call at depth 10 indexed the whole Settings Desktop artboard (about 1,190 layers, 70 KB) with names and ids. A full layer index of the file is a few dozen calls.
- Layer-name matching works. The Settings Components board holds one `SettingsList` master, and Settings Desktop holds 9 frames with the same name.
- A quick diff found real drift. `get_jsx` (`inline-styles`) of the `SettingsList` master was compared with one Settings Desktop copy, and `Settings row / Agents` with two of its copies. The structures match line for line. The copies still use `--text-sm` / `--leading-5` and `--text-xs` / `--leading-4`. The masters use the typography role tokens `--text-body-wide`, `--font-weight-body`, `--leading-body-wide`, `--text-secondary-wide` and `--text-heading-wide`. The group header also differs in colour and weight: the copy has `--color-muted-foreground` and `medium`, the master has `--color-foreground` and `--font-weight-heading`. Inference: the masters were moved to typography roles and these copies were never re-cloned. Some of this drift renders identically today but stops following the next change to the role tokens, which is the failure Sallee describes.
- Because `get_jsx` has no names or ids, a line diff only lines up when the structure matches. When it does not, the tree from `get_tree_summary` (names, child order) gives the alignment.

## Can an agent or a script do the audit and the re-clone?

### Drift audit: yes, with no LLM in the loop

Inference from the tools above and the measurements, not yet built:

1. Index: call `get_basic_info` for each page, then `get_tree_summary` (depth 10, and deeper subtrees where it reports "... N children") for each artboard. That gives every layer's name, id and parent path.
2. Masters: take every frame under a `Components / <Name>` artboard whose name is unique among masters. Copies: frames elsewhere with the same name.
3. For each pair, call `get_jsx` with `format: "inline-styles"` and normalise it. Drop text lines, which are allowed changes, and drop the copy root's placement styles (`position`, `left`, `top`, outer width). Diff what remains. A difference in tag structure is a structure drift. A difference in a `style={{…}}` line is a style drift, reported with the property and both values.
4. Hidden items: compare `isVisible` from `get_node_info` for the layers whose structure otherwise matches. Could not confirm whether `get_jsx` leaves hidden layers out, so the script has to check this before trusting a diff.
5. Tokens: `get_tokens({ format: "tailwind" })` diffed against `tooling/uniwind/theme.css`. `find_nodes` lists literals that should be tokens, for example `{ styleName: "font-size", styleValue: "*px" }` or a raw colour.
6. Output: the list the drift audit already asks for (artboard, layer name, what differs), as text or JSON.

It needs Paper Desktop open on the file and a plan with enough MCP calls. A full run is roughly one call per artboard and one per master and copy, so a few hundred calls: trivial on Pro, impossible on Free. It only reads, so it cannot damage the file. It could live in `tools/` as a TypeScript script that speaks MCP over stdio to `paper mcp`. `@modelcontextprotocol/sdk` 1.32.0 is already in the pnpm store, but only as a transitive dependency.

### Re-clone from master by layer name: feasible, riskier

Inference, untested:

1. For a stale copy, call `duplicate_nodes` on the master with `parentId` set to the copy's parent, then `move_nodes` to put the new clone just before the old copy.
2. Copy the old root's placement styles onto the new root with `update_styles`. Read them with `get_computed_styles`, then apply `left`/`top`, `alignSelf` and width. This avoids the position and stretch gotchas listed above.
3. Reapply the overrides. Text: pair old and new text nodes by tree path (child index chain) or by text-layer name, then call `set_text_content` once with all of them. `descendantIdMap` maps master ids to new ids, so the master's tree gives the paths.
4. Delete the old copy, call `finish_working_on_nodes`, and screenshot old and new for review.

The weak spots:

- No MCP tool hides a layer, so hidden-item overrides cannot be reapplied faithfully. Either make "hidden" a named state (its own master), or test whether `display: none` through `update_styles` is equivalent. Not verified.
- Never use `x-paper-clone` for composites, because of the shallow-clone report.
- A copy whose structure differs from its master cannot be mapped automatically and has to be flagged, not regenerated.
- Writes go to the live shared document. Run master by master, inside out as `paper.md` already requires, and review each one.

## Recommendations, ranked by payoff against effort

All of these are inference from the facts above.

1. **Script the drift audit (high payoff, low to medium effort).** It only reads, it replaces the slowest manual step, and it already found drift on its first try. Run it before any design review and after each master change. It also produces the token check against `theme.css` for free.
2. **Add the literal-value sweep (high payoff, low effort).** A `find_nodes` pass for px font sizes, raw colours, and icon sizes not using `--spacing-icon-*` catches copies that "stopped reading a token". Tokens are the only thing Paper propagates for us, so every literal is a value that will not follow a change.
3. **Script re-cloning for one master at a time (medium payoff, medium effort and risk).** Build it on the audit's index: the audit says which copies are stale, and the routine swaps them in with text reapplied, master by master, with screenshots. Before building it, decide how hidden items are represented, because the MCP cannot set visibility.
4. **Have fewer copies (medium payoff, low effort).** Every copy is a drift liability. Show a state once, on the master's board, and keep screen boards to compositions that actually differ. The Storybook rule "present each distinct result once" ([`docs/agents/storybook.md`](../agents/storybook.md)) carries over directly.
5. **Let code lead once a component is built (high payoff, a policy change).** For components that exist in code, Storybook web is the rendered truth. Paper copies could be refreshed from it (Snapshot of a story into Paper, or `write_html` from the story's DOM) instead of by hand. This contradicts the current rule that "Paper leads how things look" in `docs/agents/paper.md` and the design-before-code way of working, so it needs the owner's decision. It fits Paper's own "Use your code components" direction.
6. **Keep the migration path ready.** Masters named after code components, with states named after props, map directly onto "props and slots" when Paper's components ship. No date has been announced, so do not plan around it.
