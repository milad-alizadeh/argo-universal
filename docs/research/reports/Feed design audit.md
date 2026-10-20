# Feed design audit

A critical read of Argo's Feed — every row kind, every text size, the rhythm, the
wording, the icons, the speed and the Paper source — against Codex, Claude Code,
Zed, Copilot/VS Code Chat, Cursor, Windsurf, OpenCode, Crush, Goose, Amp, Devin,
Factory, Jules, Warp, Linear, Vercel, GitHub Actions, Slack, ChatGPT and Claude.ai.

Six parallel research streams, ~390 KB of notes, 30 Paper exports and 10 Storybook
screenshots back this. Every claim carries a `file:line` or a URL. Nothing in the
repo was changed.

---

## 1. Verdict

**The Feed is not badly styled. It is barely styled at all — it has one text size
and spends every other distinction on grey.**

Fifteen distinct text styles render on a phone, sixteen on desktop. **Nine of them
are the same 16/24/400 sans and differ only in colour.** That is the whole finding.
Everything else below is a consequence:

- Markdown `h1`–`h6` are **pixel-identical** (`markdown-marks.ts:26`,
  `prose.tsx:45-47` uses depth only for `aria-level`). The surface whose job is
  rendering agent answers has no heading hierarchy.
- Hierarchy therefore rests on a grey that **clears WCAG AA by 0.03** in light mode
  (`muted-foreground` 4.53:1), and on two tokens that fail outright
  (`text-focus` as a text colour at 2.48:1; `tertiary` at 2.48/2.54:1).
- The rhythm has **three values** and **no turn boundary** — a user bubble → agent
  reply gap equals an agent reply → next user bubble gap.
- The same action is worded three ways by three layers (`Reading` → `Read` →
  `Read 3 files`), and **every settled group draws a book icon** regardless of what
  it did.
- Every streamed token rebuilds the whole view model and re-lexes the whole message.
- Five of the ten `sessionUpdate` kinds draw **nothing**.
- In Paper, **all 21 Feed-row states sit in one "All sizes" column drawn at the
  desktop step** — the phone, which is the primary surface, is undesigned.

The competitors confirm the direction rather than contradict it: VS Code Chat ships
**two** text greys across 5,156 lines of chat CSS and **exactly two** font weights;
Slack and Claude.ai ship three greys. Argo's three-grey shape is right. The *values*
are wrong, and the Feed leans on them for work that type and space should do.

---

## 2. What the Feed draws — and what it doesn't

`feed-item.tsx:81-89` is the whole contract:

```ts
const drawnItemTypes = { group: true, exploration: true, tool_call: true, thought: false };
const drawnRows = new Set(['user_message','agent_message','notice','compaction_update']);
```

**Nine things get drawn:** user message, agent message, generic tool call, command
row, edit row, tool-call group, exploration, notice/compaction, turn end — plus the
live header, the zero-height "Loading earlier" pill, the empty state and
Jump-to-latest.

**Five of the ten `sessionUpdate` kinds in `packages/contracts/src/feed/session-update.ts`
draw nothing:**

| Kind | Today | Cost |
|---|---|---|
| `agent_thought` | `thought: false` | The Feed has no record of reasoning. Position is still occupied, so a thinking-only Turn renders an empty gap governed by `activity` spacing. |
| `plan_update` | Dropped at projection (`to-feed-view.ts:16`); the Plan lives above the Composer | A plan revision mid-turn leaves no trace in the transcript. |
| `session_message` | Not in `drawnRows` | Cross-Session messages vanish. Paper has a `Part / Session message` master for this. |
| `subagent_update` | Not in `drawnRows` | Subagents are invisible in the Feed; Paper has three masters (spawned/messaged/result). |
| `task_update` | Not in `drawnRows` | Paper has completed/failed/cancelled masters. |

Shape is uniform to a fault: every row is a `SessionColumn` (`px-4 wide:px-6`,
`max-w-column` 800px); only the user message has a bubble; agent messages have no
icon and no container; everything else is the same `FeedDisclosure` — 20/16px icon,
role-less body-size muted label, 12/14px chevron, closed by default, `pt-2`, and
**zero horizontal indent at any nesting depth**. A four-level nest
(group → exploration → tool call → diff) is drawn as a flat stack distinguished only
by chevron state.

---

## 3. Typography

### 3.1 The scale, as built

`tooling/uniwind/theme.css` is clean and small, which is good:

| Role | Phone | Desktop (`wide-type`) |
|---|---|---|
| `title` | 20/24/600 | 20/24/600 |
| `heading` | 16/24/600 | 14/20/600 |
| `body` | 16/24/400 | 14/20/400 |
| `secondary` | 14/20/400 muted | 12/16/400 muted |
| `control` | 14/20/500 | 14/20/500 |
| `badge` | 12/16/500 | 12/16/500 |
| `code` | 12/20/400 mono | 12/20/400 mono |
| `row` / `row-detail` | 16/24 / 14/20 | 14/20 / 12/16 |

Four content roles, Apple-HIG shaped, phone one step up. That is a *good* system and
it is not the problem.

### 3.2 Nineteen styles, nine of them the same size

What actually renders in the Feed is **15 distinct (family, size, leading, weight,
colour) combinations on phone and 16 on desktop**. Nine are 16/24/400 sans separated
only by colour. A reader cannot learn a hierarchy expressed in nine greys of the same
size, and anyone with reduced contrast sensitivity loses it entirely.

This is a direct consequence of a standing decision — *Feed: one text size* (the Body
role everywhere, `type-feed` removed 2026-10-09 for differing from Body only in
leading). That decision is defensible and it is why the Feed is calm. But paired with
"everything secondary is `muted-foreground`" it leaves exactly one channel for every
distinction the Feed has to make. See §10.0 for how this was settled.

### 3.3 Markdown headings do not exist — though Paper says they should

> **Fixed 2026-10-20.** The Markdown master on *Argo · Foundations* already specifies
> two steps — `#` takes the Title role, `##` and deeper the Heading role. The code drew
> all six levels identically, so this was drift, not a missing design. `prose.tsx` now
> takes the role from the heading level and the raw size override is gone.

```ts
heading: 'font-semibold',
proseHeading: 'font-semibold wide-type:text-base wide-type:leading-6 pt-1',
```

`h1` through `h6` all render `type-body` + `font-semibold`. Depth is used only for
`aria-level`. Three further problems in that one line:

1. `wide-type:text-base wide-type:leading-6` is a **raw size override** — against the
   *text sizes: tokens only* rule — pushing desktop headings to 16/24 while desktop
   Body is 14/20.
2. It makes desktop render **two** bold styles (16/24/600 headings, 14/20/600 inline
   bold) where phone renders one.
3. `type-heading` exists in `theme.css` and is **never used**.

The Composer's preview disagrees with the Feed too: `rich-textarea-theme.ts:9` uses
plain `heading`, so typing a heading and sending it changes its desktop size.

### 3.4 Contrast: three outright failures and a knife edge

Computed exactly — Tailwind v4 neutrals are `oklch(L 0 none)`, so luminance is `L³`.

| Token | Light on `content` | Verdict |
|---|---|---|
| `foreground` | 18.96:1 | fine |
| `muted-foreground` | **4.53:1** | clears AA by 0.03, at 12px on desktop. Any 2% hover tint puts it below. |
| `tertiary` | **2.48:1** (dark 2.54:1) | fails SC 1.4.11's 3:1 for the disclosure chevron it exists for |
| `text-focus` used as text | **2.59:1** | a focus-ring token used for diff **line numbers** and diff **context lines** — the unchanged code you actually read |
| `text-focus` as a link underline | **2.59:1** | fails SC 1.4.11's 3:1, and the underline is a link's only mark |
| `success` / `warning` / `danger` | 3.08 / 3.06 / 3.66 | **no semantic colour reaches 4.5:1 in light**; all drop under 3:1 on tinted surfaces |

The themes are also asymmetric: light `muted-foreground` is 4.53:1, dark is 7.63:1.
Secondary text is *much* quieter in light than in dark — the hierarchy changes
strength when you flip theme. GitHub Primer's equivalent is 6.11:1.

**Correction, after reading the renderer again:** a markdown link is *not* coloured
with `focus`. `markdown-link.tsx` resolves that class only to read a colour and sets
it as `textDecorationColor`; the label keeps the surrounding foreground, exactly as the
Link master specifies. The failure is narrower than I first wrote — the **underline**
was at 2.59:1 against a 3:1 requirement — and the class name `viewColor` is what misled
me. The diff numbers and context lines were the real text failures.

> **Fixed 2026-10-20.** `muted-foreground` light → neutral-600 (7.8:1, matching dark's
> 7.6:1). `tertiary` → neutral-500 in both themes (4.7 light / 3.8 dark on a card) and
> documented as marks that repeat an adjacent label. `focus` light → neutral-500, which
> fixes the ring and the underline in one token. Diff line numbers now take `tertiary`;
> diff context and note lines take `muted-foreground`. `viewColor`/`domColor` renamed to
> `viewUnderlineColor`/`domUnderlineColor`.

### 3.5 Measure: 123 characters

At 800px and 14px SF Pro Text, a prose line is **123 characters** — 1.6× the top of
Bringhurst's 66–75 band and well past Butterick's 90 ceiling. It is invisible in
Paper because designers mock up short paragraphs.

The structural insight: **800px is a code column being used as a prose column.** For
SF Mono it gives 92 columns at 14px — exactly right for code and diffs, where
horizontal room is genuinely useful. One measure cannot serve both.

For reference: ChatGPT runs text at **768px** with wide blocks escaping to 1024px;
Claude.ai at **672px**; Zed's agent panel at **850px**; VS Code Chat at **950px**;
Cursor refuses to choose and ships a Narrow→Wide slider; Amp makes `Full Width` a
menu item.

Phone is fine: 390pt with the 20pt gutter gives 52 characters at 16px.

### 3.6 The mono/sans pairing rests on a false premise

Measured from the font files: **SF Pro Text and SF Mono have identical cap-height and
x-heights within 0.5%.** The folklore that mono must be set smaller because it "looks
bigger" does not apply to this pair.

| Context | mono x-height vs its neighbour |
|---|---|
| desktop 14px sans / 12px mono | **14% shorter** |
| phone 16px sans / 12px mono | **25% shorter** |

12px mono against a 16px phone body is indefensible — a shell command is markedly
harder to read than the sentence above it. The two systems that reasoned about this
publicly both landed on ~0.93, i.e. **one step down, not two**: GitHub Primer sets
inline code at `0.9285em`; Vercel's Geist documents "mono one step smaller than the
sans it pairs with".

`type-code` is also doing two jobs at once — a code span inside a sentence and a
400-line shell transcript. Carbon splits these (`code-01` 12px inline, `code-02`
14px block) and the split is right.

And the leading mismatch it causes is already being patched at call sites:
`feed-disclosure-label.tsx:33-37` applies `leading-none` to crush a mono line box to
12px so it stops pushing the label off centre.

---

## 4. Rhythm

The Feed's entire vertical rhythm is three values (`feed-entry.ts:61-65`):

```ts
activity:     'pb-2 wide:pb-1.5'                          //  8 / 6
agentMessage: 'pb-paragraph wide-type:pb-paragraph-wide'  // 12 / 10
other:        'pb-6 wide:pb-5'                            // 24 / 20
```

Four defects:

1. **There is no turn boundary.** `spaceBelowEntry` returns `other` for any change of
   kind, so user bubble → agent reply is the same 24px as agent reply → next user
   bubble. The strongest break in the transcript is invisible.
2. **Two breakpoints for one rhythm.** Rows switch at `wide:` (≥1100px), paragraphs at
   `wide-type:` (≥600px on web). Between 700 and 1099px the type is desktop-sized and
   the row spacing is still phone-sized.
3. **The ramp is flat.** 8 / 12 / 24 reads as "small, small, big". A legible ramp needs
   each level ≈1.5× the one below.
4. **Nothing indents.** Nesting depth is carried only by chevron state.

Three more declarations of "the gap between two paragraphs" exist in parallel
(`feed-markdown.tsx:15`, `feed-entry.ts:63`, `feed-content.tsx:124` — the last at
`gap-2.5`/10px, a step that appears nowhere else in the Feed), and the group body gap
(`gap-2 wide:gap-1.5`) duplicates the activity gap in a second file.

What good looks like, with each level distinguishable at a glance:

| Join | Phone | Desktop |
|---|---|---|
| paragraph ↔ paragraph | 12 | 10 *(unchanged)* |
| row ↔ row inside a group | 8 | 8 |
| block ↔ block in one message | 16 | 12 |
| group ↔ group | 24 | 20 |
| **turn ↔ turn** | **40** | **32** |

Leading: desktop body at 14/20 is **1.43** — right for a list row (it is exactly
Material's `body-medium` and Atlassian's `font.body`) and tight for multi-paragraph
prose, where 1.5 is the convention and WCAG 1.4.12's baseline. Code's 12/20 = 1.67 is
*correct* and should stay: a transcript reader is scanning unfamiliar output with no
indentation cues. Atlassian ships `font.code` at exactly 12/20 too.

No baseline grid. Argo mixes 16/20/22/24px line boxes; the common divisor is 2px,
which is a coincidence, not a grid. Keep spacing on the 4px scale and align mixed-size
items on their centres — which is what every modern system actually does.

---

## 5. Wording

**Three tenses for one action, produced by three layers:**

| Layer | String | Source |
|---|---|---|
| live header | `Reading src/a.ts` | `packages/engine/.../live-header/tool.ts:27-32` |
| settled row | `Read src/a.ts` | `tool-call-title.ts:44-48` |
| group summary | `Read 3 files` | `group-title.ts:23-29` |

Copilot solved this years ago with one contract: every tool declares an
`invocationMessage` and a `pastTenseMessage`, so `Reading foo.ts` → `Read foo.ts` is
*the same row* with one verb inflected — no layout change, no icon swap, no reflow.
Codex does the same (`Running`/`Ran`/`You ran`, `Exploring`/`Explored`) and goes
further: it **recolours the same bullet glyph** green or red instead of swapping it.

The rest of the wording defects, with file refs:

- **The same command outcome, twice, in two registers.** Trailing says `exit 1 · 1.4s`
  lower-case (`command-state.ts:57`); the footer 12px below says `Exit 1` (`:46`).
  Same for `failed` / `Failed`.
- **`Stopped` means three different things** — a cancelled tool call
  (`tool-call-row.tsx:21`), a cancelled command (`command-state.ts:35`), and three
  turn ends (`turn-end.tsx:16,21,25`: you stopped it, the output limit, too many steps).
- **Running a command has three strings**: `Running command`, `Running ${command}`
  (which dumps the raw shell wrapper into the one-line live header), and `Running`.
- **Two empty-Feed questions**, in two type roles: `What should we build?`
  (`feed.tsx:39`, role-less body) vs `What should we work on?`
  (`new-session-feed.tsx:56`, `role="title"`).
- **Searches count "times", listings count "folders", reads count "files".**
  `Searched the web 1 time` is the output.
- **`MultiFileEdit` always says "Edited N files"** even for deletes and moves, always
  plural (`multi-file-edit.tsx:21`).
- **Code-block "languages" are English words**: `"Shell"`, `"Output"` — and the same
  prop also receives a file basename.
- **Two minus signs.** ASCII `-` in the Feed edit row (`file-edit.tsx:66`), U+2212 `−`
  in the diff header and gutter — and the gutter *copies* `-` while *drawing* `−`.
- **`Couldn't edit` vs `Failed`** — a sentence in one row kind, one word in another.

### Confirmed bug

`code-block-header.tsx` tests lowercase `['bash','sh','shell','zsh']` for the terminal
glyph, while `command-row.tsx` passes `language="Shell"` (capital S). **Every shell
block in the Feed draws a generic document icon.**

---

## 6. Icons

- **Every settled group shows a book.** `tool-call-group.tsx:52` hardcodes
  `icon: 'read'`, so a group that ran commands and edited files is drawn with the read
  glyph. An *open* group shows the real live icon — so **the row changes identity when
  the work finishes**, which is precisely the reflow every competitor engineered out.
- **A globe means local grep.** `search` and `fetch` both map to `web`
  (`tool-call-icon.ts:7-8`), although an unused magnifier and compass sit in the symbol
  table.
- **A pencil covers edit, delete and move** at the row header, while `file-edit.tsx:20-25`
  gives delete and move their own glyphs on the file line. Same operation, two icons,
  depending on nesting.
- **`check` means three things** (succeeded, you allowed, copied); **`close` means two**
  (failed, you denied) in two colours; there are **two different xmarks** for failure.
- `command-row.tsx:97` hardcodes `icon="terminal"` instead of calling `toolCallIcon`,
  so the same command gets a terminal here and a book inside a group header.

For scale: VS Code Chat's design-token linter permits **exactly two icon sizes**
(`ALLOWED_CODICON_PX = new Set([16, 12])`). Argo's Paper masters currently use four
slot sizes (16×20, 16×16, 14×14, 20×20) for one 16px icon role.

---

## 7. Speed

**The headline: every streamed token rebuilds the entire Feed view model and re-lexes
the whole streaming message.** Everything else is second order.

`onLiveData` (`use-session-feed.ts:91-116`) commits React state per subscription event
with no coalescing. Each commit runs five O(held rows) passes and allocates five new
N-sized arrays:

1. `replaceHeldRow`'s `rows.map` — `feed-row-events.ts:49`
2. a full `toFeedView` over every row — `to-feed-view.ts:37-54`
3. `keepUnchangedItems` with a Set + Map over all items — `keep-unchanged-items.ts:61-62`
4. `withoutDisclosedTurnEnds`' `new Set(items.flatMap(rowIds))` — `turn-end.tsx:66`
5. a `withLiveHeader` spread — `feed-entry.ts:36`

In parallel `FeedMarkdown` re-runs `lexer(text)` over the *whole* message on each chunk
(`feed-markdown.tsx:26`), so per-message markdown cost is **quadratic in length** — a
10 KB answer streamed in 300 chunks lexes ~1.5 MB of markdown. There is no module-level
cache, and `recycleItems: false` means a row that scrolls out of range unmounts and
**re-lexes from scratch** when it comes back.

The good news, verified against LegendList 3.6.0's source: identity preservation
genuinely works, `set$` bails on `===`, and `Container` memoises on
`[itemKey, data, extraData]`. Only the streaming row and the live header actually
re-render. **The damage is all upstream of React, in allocation and GC.**

Second order, in rank:

| Finding | Where |
|---|---|
| Feed collapsibles animate **on the JS thread on every platform** — `feed-row.tsx:68` always supplies the sync context, bypassing the Reanimated and CSS paths. 12–24 React commits + 12–24 `setItemSize` calls per open. | `collapsible-layout-motion.tsx:37-85` |
| `renderItem` depends on the whole props object, which also hides a stale-`entries` bug | `list-data.tsx:122`, `feed-scroll.tsx:75` |
| `estimatedItemSize: 48` is far below the real median row height | `feed-scroll.tsx:24` |
| `ShimmerText` is **one `Animated.Text` + one worklet per character** — a 40-char live header is 40 native views and 2,400 worklet calls/second — and `useClock` ticks the duration into the title every second, restarting the sweep on each digit change | `shimmer-text.tsx:122-130` |
| Every code block mounts two nested `ScrollFadeView`s → up to **4 react-native-svg gradients + 2 scroll trackers + 4 worklets per block**, and `FeedCodeBlock` is also used for every terminal and tool output | `code-block-body.tsx:32-58` |
| `keep-place.ts` runs unbounded concurrent rAF loops with no "user is dragging" guard | `keep-place.ts` |
| `loadOlder` can cascade several 150-row pages, each with an O(N log N) re-sort | `use-feed-history.ts:58-71`, `feed-revisions.ts:38` |
| **There is no syntax highlighting at all** — code blocks are a single plain `<Text role="code">` | `code-block-body.tsx:19-29` |

`tools/perf/` is Chromium-only and has no streaming, expand or paging scenario, so the
two heaviest paths are unmeasured.

---

## 8. Paper: the design source is behind the code

Five Feed families on `Feed Components · Feed`: `SessionHeader` (9 states), `Feed` (4),
`FeedRow` (2), `FeedRow · Messages` (8), `FeedRow · Tool calls` (7).

- **All 21 Feed-row states sit in a single "All sizes" column drawn at the desktop step**
  (`--text-body-wide` 14/20). The Mobile board proves that is false — phone rows are
  16/24. `SessionHeader` is the only card on the board with correct Desktop | iOS |
  Android columns. This violates *Component cards: desktop + phone*.
- **Masters with no code:** in-Feed Subagent rows (×3), the Questionnaire trio, the
  mode-switch row, Task updates, `Part / Session message`, "Plan outcomes".
- **Code with no master:** the `exploration` / "Exploring" group, Plugin-Slot-replaced
  rows, `DiffViewedMark`, `UnsupportedFeedContent`, `tool-output`.
- **Six `--color-syntax-*` tokens colour every Feed code block in Paper and exist nowhere
  in the repo** (plus `rose-600`, `orange-700`, `sky-900`). The Feed's entire code
  colouring has no code token — the largest design↔code gap in the Feed, and the thing
  that would have to exist before syntax highlighting ships.
- Paper flattens platform variants to one value: rail 56 (web) vs base 80;
  `--radius-grouped-inner` and `--tracking-row` to their Android values.
- **The Android Feed on the Mobile board is a byte-copy of iOS** — system font, no
  Roboto, no tracking.
- Every mono secondary line in the Feed is drawn **12/20** in Paper where
  `type-secondary-code` resolves to **12/16** on desktop. And `type-secondary-code` has
  no Foundations row at all.
- Markdown `Heading` and the empty-state title are written as literal `16/24/600`
  instead of the role tokens — the same defect as §3.3, mirrored in the design.
- `Agent message (streaming)` draws a **dashed top border**; it is the only dashed edge
  in the product and *No hairline separators* says there are none.
- Row rhythm (20/6) exists only as per-node margins on each copy. **No master records
  the Feed's vertical rhythm.**

---

## 9. What the best feeds actually do

Hard numbers exist for only four GUI feeds. The rest publish nothing, and nothing below
is guessed.

| | Body | Tool row | Code | Weights | Text greys | Max width |
|---|---|---|---|---|---|---|
| **VS Code Chat** | 13 / 19.5 | 12 (origin 11) | 13 | **exactly 2** (400/600) | **2** | **950** |
| **Zed agent panel** | 14 | 13 | 12 | 3 | 3 | **850** |
| **ChatGPT** | 16 / 26 | 12 | 14 | 300–700 | **21** | **768** (wide 1024) |
| **Claude.ai** | prose 16/24, UI 14/20 | — | 13 / 19 | 400/500/580/600 | **3** | **672** |
| **Slack** | 15 / 21.9 | 13 caption, 12 stamp | — | 4 | **3** | — |
| **Vercel Geist** | copy 14/20 | label 13/**16** | 13 mono | 3 | **20** | — |
| **Linear** | 15 / 24 | 13 | — | 5 (510/590/680) | **23** | — |
| **Argo today** | 16/24 · 14/20 | same | 12 / 20 | 2 | 3 | **800** |

Argo's *shape* already matches the best: three greys, two weights, 800px. The gaps are
in the values and in what the Feed does with them.

### Ten things worth stealing, ranked

1. **A fixed identity gutter that does the grouping work.** Slack: a 36px avatar / 56px
   timestamp column that a grouped follow-on row simply *blanks* — same 8px padding, no
   separator, no indent change, no reflow. Codex's 2-column `• ` prefix is the same idea
   in a terminal. This alone removes most of the visual noise in an agent transcript.
2. **Present → past label pairs on the same row.** Copilot's `invocationMessage` /
   `pastTenseMessage`. Fixes Argo's three-tense problem with one contract.
3. **Recolour the status glyph in place, never swap it.** Codex keeps the same `•` and
   turns it green or red. The cheapest possible completion signal, and the exact fix for
   Argo's "settled group becomes a book" defect.
4. **`tabular-nums` on any row with a changing count.** VS Code's own comment: *"Fixed-width
   digits so a streaming count doesn't jitter as it changes."* On React Native this is
   `fontVariant: ['tabular-nums']`. SF Mono is already tabular, so only the *sans*
   metadata roles need it.
5. **Two leadings per size — `label` vs `copy`.** Geist ships `text-label-13` at 13/16
   and `text-copy-13` at 13/18. Argo has exactly these two cases: a single-line tool
   header and a wrapped markdown paragraph.
6. **Thresholded metadata.** Zed hides the stopwatch below 30s and the token count below
   250; Copilot suppresses any duration under 1000ms. Most rows then carry *no* metadata,
   so the rows that do mean something.
7. **Never collapse if collapsing hides only one line.** Crush, literally.
8. **A collapsed group header that carries its own stat and is a link.** Devin: the
   `+X −Y` on a collapsed group opens a multi-diff editor. Collapsing stops being lossy
   when the header still answers the question.
9. **Fade-truncate, never inner-scroll.** Zed uses a 48px gradient; Sentry removed its
   inner scroll in favour of N items + "View all" into a drawer that owns its own find.
10. **Group boundaries declared by the producer.** GitHub Actions' `::group::` is a
    protocol, not a UI feature — over ACP an Agent or Plugin could emit its own group
    markers instead of Argo guessing.

### What every one of them gets wrong

**Everybody over-collapses, and users say so.** Cursor folds `Explored (x) tools`
*retroactively* and *in defiance of the user's own `Detailed` setting* — staff first
denied it, then confirmed it folds at every density. Codex shipped `Ran N commands`,
took sustained complaints (*"I'd much rather just see the commands scrolling than have
them grouped and have no idea what is happening"*), and **reverted it** in CLI 0.162.1,
keeping grouping only for `Explored`. GitHub Actions hides collapsed content from search.
Amp's "Less Noise" folds ten rows into one by design.

**The safe boundary, arrived at from both directions: group reads; never group writes or
commands.** Argo's `exploration` grouping is already on the right side of that line; the
generic `tool_call_group` is not.

**Anti-jitter is retrofitted everywhere.** VS Code's `tabular-nums` and its
`padding-top: 2px` "so the text doesn't shift"; Goose's throttled re-render; OpenCode's
480ms/240ms label cross-fade; Devin shipping a fix because settled cards reopened on late
output; Raycast's *"Removed flashes of incorrectly parsed content during streaming"*.
Build it in.

**And the honest opposing thesis.** Amp argues the Feed shouldn't be watched at all:
*"If you have the patience to watch your agents work step-by-step, you're giving them too
short a leash."* Everything in this report assumes the opposite. Worth stating, because
if that bet is right, the design effort belongs in the collapsed state — and Cursor's
users show that getting that default wrong is the loudest complaint in this whole space.

---

## 10. The plan

### 10.0 The three decisions — settled 2026-10-20

The owner answered: **keep the 800**, and take my recommendation on the rest.

**A — prose measure: A1.** `--container-column: 800px` is unchanged. The 800 column stays
the structural width for cards, rows, code blocks, diffs, the header and the Composer.
Only markdown *prose* blocks (paragraphs, lists, blockquotes, headings) get a `max-width`
of ~640px inside it, left-aligned to the column, not centred — so the agent's left edge
never moves and nothing else in the Feed narrows. 640px at 14px is ~78 characters.
Code blocks, tables and diffs explicitly opt out and keep all 800.

**B — code size: raised, and simpler than I proposed.** `code` becomes **14 / 20 on
every width** (`--text-code: var(--text-sm)`, was 12 / 20). I recommended 13 desktop /
14 phone; building it, 13px needed a raw step no other role uses, while 14 is an
existing token and lands mono *exactly* on desktop Body — same size, same 20px leading,
same baseline grid, with the measured x-height match making equal sizes look equal. On
phone it sits one step under Body, which code wants. Mono stops being a size exception
and becomes only a family exception. It removes the `leading-none` patch in
`feed-disclosure-label.tsx`, and costs an 800px code block 16 columns (111 → 95).

**C — new roles: one of three.**

- `prose` — **rejected.** It is the shape of `type-feed`, removed 2026-10-09. A1 buys the
  readability without a second body role.
- `code-inline` — **rejected, reversing what I recommended.** Its whole case was that a
  span in a sentence and a block need different sizes. Once B makes `code` one size
  everywhere, the two differ only in the chip's padding and background — a component
  concern, not a type role. *Tokens: generic only* rules it out.
- `metric` — **rejected as a role.** Instead `fontVariant: ['tabular-nums']` goes on the
  existing `secondary` and `badge` roles. No new token, no new size, durations and counts
  stop jittering.

Phase 4 is unblocked. Phases 1–3 never depended on these.

**Done so far (2026-10-20).** In Paper, on *Argo · Foundations*: `muted-foreground` →
neutral-600, `tertiary` → neutral-500 with a new documented row on the Colour roles card,
`focus` → neutral-500, `text-code` → `text-sm`, and the Text and Markdown cards' specs
rewritten to match. In code: those four tokens, `tabular-nums` on `secondary` and
`badge`, `secondary-code` put on the Secondary role's steps, markdown headings given
their type role, the `leading-none` patch deleted, diff line numbers and context lines
moved off `focus`, one minus sign, the Feed rhythm put on one breakpoint, and the
shell-icon bug fixed. Client typecheck clean, 451 tests pass. **Not yet done in Phase 1:
nothing.** Phase 2 (speed) landed the same day: see its section for the three items that
changed shape under measurement, and for the Phase 1 regression the browser suite caught.

---

### Phase 1 — Correctness, no design decisions needed — **done 2026-10-20**

These are bugs or rule violations. The Foundations tokens moved in Paper first; nothing
here needed a new Paper design.

1. ✅ **`text-focus` stops being a text colour.** Diff line numbers take `tertiary`;
   diff context and note lines take `muted-foreground` (2.59:1 → 4.7 and 7.8). `focus`
   itself goes to neutral-500 so the ring and the link underline clear 3:1.
2. ✅ **`muted-foreground` light → neutral-600** (4.73 → 7.81:1), matching dark's 7.63 —
   the hierarchy stops changing strength with the theme.
3. ✅ **`tertiary` → neutral-500 in both themes** (2.59 → 4.73 light; 2.33 → 3.79 dark on
   a card), and formally restricted on the master to marks that repeat an adjacent
   label.
4. ✅ **The shell-icon bug** — `code-block-header.tsx` now lower-cases the language
   before matching, so a Shell card draws the terminal icon its rows already draw.
5. ✅ **One minus sign** — `file-edit.tsx` drew an ASCII hyphen where the diff gutter and
   the change counts draw U+2212. ASCII stays in the copied patch.
6. ✅ **One breakpoint for the rhythm.** All three gaps now step on `wide-type:`, with
   the type scale, instead of two of them stepping on the window width.
7. ✅ **The raw size override is gone.** `prose.tsx` reads the heading level and asks for
   the Title or Heading role, so `type-heading` is finally used and no heading invents a
   size. The Composer's preview and the Feed agree again.
8. ✅ **Tabular figures on `secondary` and `badge`** — `font-variant: tabular-nums`,
   which Uniwind parses into RN's `fontVariant`. Also found and fixed in passing:
   `type-secondary-code` kept a 16px line box, which would have clipped 14px mono; it
   now takes the Secondary role's steps, so a path and the text beside it share a size.

### Phase 2 — Speed — **done 2026-10-20, with one item re-scoped**

Ordered by measured impact. Independent of all design work, and landed first so the
redesign is evaluated on a fast Feed. No design decision, no Paper work: the only visible
change in this phase is that the running title's shimmer sweeps per word.

1. ✅ **Streaming events commit once a frame.** `useFrameCommit` holds the newest
   `FeedState` and commits it on the next animation frame. The rows themselves still take
   each event as it lands, so the event after it reads the newest text — only the commit
   that rebuilds the view and redraws the list waits. That takes `toFeedView`,
   `keepUnchangedItems`, `findLiveToolCall` and the list render from once a token to once
   a frame. A commit held for a Session the reader has left is dropped by its session tag,
   so it cannot land over the next Session's first page.
2. ✅ **A module-level cache for `lexer`.** `lexMarkdown` keeps the 120 most recently
   drawn texts, re-inserting on a hit so the texts still on screen are the last dropped,
   and skipping texts over 200k characters. It kills the re-lex a row pays for leaving the
   list and coming back, and `plan-title.ts` — which lexed the same plan twice on every
   draw, once for the title and once for the body — now reads both from one entry.
3. ⚠️ **Collapsible motion stays on React state, and the reason is structural.** The
   finding was right: `LayoutSyncedContent` is the one motion path in the app that runs a
   `requestAnimationFrame` loop with a `setState` per frame, on native as well as the web,
   while every other surface animates on Reanimated's UI thread. It cannot move. Each
   frame it must call `setItemSize` on the list so the rows below it move in the same
   frame, and that is a JS-thread API — a UI-thread worklet cannot reach it. What I did
   check is the cost: `children` is passed through as one unchanged element, so React
   bails out of the whole content subtree and the per-frame re-render is three shallow
   wrappers, not the markdown inside them. The report overstated this one. Moving it would
   mean changing how the list is told about sizes, which is its own piece of work.
4. ✅ **The Feed row stops redrawing on every commit** — and not by the means proposed.
   Stabilising `renderItem` in `list-data.tsx` was the wrong fix: the callback closes over
   the whole `ListProps` object, so freezing it behind a ref would have stopped every list
   in the app from reacting to a changed `appearance`, `padding` or `getSectionKey`. There
   was also no stale-`entries` bug at `feed-scroll.tsx:75` — `entries` is in that
   callback's dependencies. The real cost was that a changed `renderItem` re-runs for each
   visible row, and each run rebuilt the row. `FeedRow` is now `memo`, and
   `keepUnchangedItems` already keeps an unchanged entry's identity, so a commit re-runs
   `renderItem` cheaply and React bails out at every row whose own entry — and the entry
   after it, which sets its space below — did not change.
5. ✅ **`estimatedItemSize` 48 → 112.** Measured in Storybook over the long Session's
   recorded Feed: rows average 91px in the 800px column and 138px on a phone (medians 40
   and 72). One number serves both widths, so it sits between them. The median would have
   been the wrong statistic — the estimate sets the total content height, where the mean
   is what the error is measured against.
6. ✅ **The shimmer sweeps per word.** A running title was one `Animated.Text` and one
   worklet per character; it is now one per word, which is five to six times fewer
   animated nodes on a typical title. The band is still eight characters wide on each
   side, measured from each word's centre, so a word still brightens and dims as the band
   passes. The sweep also no longer restarts when the title grows: it runs 0 → 1 and reads
   the text's length inside the worklet from a shared value, so a title getting longer
   widens the sweep in place. (There was no `useClock` — the restart came from the effect's
   dependency on the character count.)
7. ✅ **Three more scenarios in `tools/perf/`**, in their own `feed-scenarios.mts`:
   `expand` opens and closes the Feed's first six collapsibles one at a time, closing each
   before opening the next so the Feed keeps its shape; `paging` reopens the Session from
   cold each pass and pages the whole Feed in from the top; `streaming` sends a prompt and
   measures the Feed until the Turn's Stop disappears. `feed` moved there with them.

**Checks.** Client typecheck clean; 451 node tests pass; the whole Storybook suite passes
(342 files, 1468 tests); the eight live-Feed e2e scenarios pass on the web project, which
is the only coverage the frame-commit path has.

**Caught in passing: Phase 1 had broken four Storybook stories and one e2e step.** The
single minus sign in item 5 of Phase 1 changed what the edit row renders, and the
`edit-row` stories and `e2e/steps/live-feed.ts` still asserted an ASCII hyphen. Phase 1
was verified with the node tests, which do not load stories, so the failure only showed
when the browser suite ran. The expectations now read U+2212.

### Phase 3 — Wording and icons, one system each

Paper-first (*Design before code*): the masters change, you sign off, then code follows.

**Wording.** One contract, Copilot's: each tool declares a present form and a past form,
and the Feed inflects the verb without changing the row. That deletes the three-layer
split, `Stopped`'s three meanings, the `exit 1` / `Exit 1` register clash, and the three
`Running` strings. Rules to fix alongside it: count objects not effort (`Searched 3
files`, never `3 times`); never `1 time`; `Edited`/`Deleted`/`Moved` chosen from the
change kind; the duration becomes a **trailing element, not part of the title string**
(today it is concatenated in, so it clips before the title does and shimmers with it).

**Icons.** One glyph per concept, two sizes only (16 and 12, as VS Code enforces):
magnifier for local search, globe for fetch only, distinct glyphs for edit / delete /
move at every nesting level, one xmark, and `check` reserved for success — allow and
copied get their own.

**And the group keeps its identity.** A settled group shows the icon of what it actually
did, not a book. Where a group is mixed, show the dominant kind and keep the chevron —
never change the row's identity because the work finished.

### Phase 4 — The rhythm and the reading surface

Decisions A–C are settled (§10.0); this phase needs Paper first.

1. **Five-level spacing ramp** (§4), with a real turn boundary at 40/32.
2. **One fixed identity gutter** on the left of every row — icon or timestamp — blanked
   for consecutive rows of the same kind (Slack's trick, Codex's discipline). This is what
   finally lets nesting read without indentation, and it is the single highest-value
   change in this report.
3. **Markdown heading hierarchy**: h1/h2/h3 get real steps; h4–h6 fold to the smallest.
   Two steps maximum, per *one axis at a time*.
4. **Prose measure**: markdown prose capped at ~640px inside the unchanged 800px column;
   code blocks, tables and diffs keep the full 800.
5. ~~**Code size** 13/20 desktop, 14/20 phone, and the new `code-inline` role.~~
   **Settled in §10.0 and shipped in Phase 1**: 14/20 on every width (Decision B), with
   `code-inline` rejected (Decision C). Left here struck through so the phase is not read
   as asking to reverse them.

### Phase 5 — Richness

What the Feed does not draw today. Each needs a Paper design before any code
(*Design before code*), and Paper already has masters for four of the five.

1. **Thoughts** — currently `thought: false`, leaving an empty gap. Live-only, like
   Codex's desktop app, or a collapsed disclosure; either is better than a hole.
2. **Subagents** — three Paper masters exist, nothing in `features/feed/` draws them.
3. **Task updates** — three Paper masters exist, nothing draws them.
4. **Session messages** — a master exists, nothing draws them.
5. **A failed edit keeps its diff.** `edit-row.tsx:27` throws it away, so you can never
   see what the Agent tried to write. This is the worst richness defect in the Feed.
6. **Syntax highlighting.** There is none. It needs the six `--color-syntax-*` tokens to
   exist in `theme.css` first — they exist only in Paper today — and it must land behind
   the Phase 2 lexer cache, not before it.

### Phase 6 — Paper

1. **Give all 21 Feed-row states their Desktop | iOS | Android columns.** "All sizes"
   drawn at the desktop step is wrong on every one.
2. **Make the Android board actually Android** — Roboto and `--tracking-row`, not a
   byte-copy of iOS.
3. **Record the vertical rhythm on a master** instead of per-node margins on each copy.
4. **Reconcile the orphans** both ways: delete masters for things that will never be
   drawn, draw masters for `exploration`, Plugin-Slot rows, `DiffViewedMark`,
   `UnsupportedFeedContent` and `tool-output`.
5. **Fix the eight drift items** — one pill role, one icon slot size, one inner fill, one
   inner padding, no dashed edge, role tokens for headings, `color-mix` for the shimmer,
   one gutter.

---

## 11. What I would not do

- **Do not add a density setting.** Cursor's `Conversation Density` is the most complained
  about feature in this entire survey, because it does not control what it claims to.
  Warp's compact mode and block dividers are two uncoupled toggles. Get one density right.
- **Do not collapse writes or commands by default.** Codex shipped it and reverted it.
- **Do not add a second content width slider.** Cursor and Amp both punted the decision to
  the user; Argo having picked 800 is a differentiator, and A1 keeps it.
- **Do not add syntax highlighting before the lexer cache.** It would land in a pipeline
  with no token cache at all.
- **Do not let the Feed grow a stats footer.** Codex's turn separator degenerates into
  `Local tools: … • Inference: … • WebSocket: … • TTFT: … • TBT: …`. Zed's thresholds
  (30s, 250 tokens) are the right answer: most turns end with nothing.

---

## Appendix — Source material

Full working notes (not committed):

| File | Size | Contents |
|---|---|---|
| `audit-rows.md` | 69 KB | 22 sections, one per row kind; the full `spaceBelowEntry` matrix; padding/gap and icon tables; ~95 strings alphabetised with `file:line`; **48 numbered inconsistencies** |
| `research-competitors.md` | 102 KB | 17 sections: Codex CLI + app, Claude Code, Zed, OpenCode, Crush, Goose, Copilot, Cursor, Windsurf, Amp, Devin, Factory, Jules, Warp, 10 adjacent references, 3 comparison tables, 20 ranked ideas |
| `research-warp.md` | 59 KB | 8 references measured from shipped CSS: Warp, Linear, Vercel Geist, GitHub Actions, Raycast, Height/Sentry/Datadog, Slack, ChatGPT + Claude.ai |
| `research-typography.md` | 57 KB | Font metrics measured from the files; measure; rhythm; grey hierarchy; streaming; diffs; Dynamic Type; numerals; a proposed scale |
| `research-competitors-vscode.md` | 50 KB | The VS Code / Copilot hard-numbers anchor, read from source |
| `audit-typography.md` | 41 KB | Every text node in the Feed; exact contrast ratios; 23 ranked defects |
| `audit-performance.md` | 32 KB | Streaming, markdown, virtualisation, animation, paging — verified against LegendList 3.6.0 source |
| `audit-paper.md` | 27 KB | 5 Feed cards, 21 row masters, Paper↔`theme.css` discrepancy table, design gaps both ways, 12 drift items |
| `paper/*.png` | 30 files | 5 card shots, 21 row masters, 2 desktop screens, 2 phone screens |
