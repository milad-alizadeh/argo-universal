# Blind Composer shell audit

Measured 2026-10-06. Scope: card shell, editor, image attachments and oversized-image error, Attach / combined Agent–Model–Effort / Mode / Send / Stop toolbar. Footer, Plan/context controls, popover/sheet interiors, and integrated screen layout are excluded. No implementation or Paper changes were made. No previous audit, checklist, or PR conclusions were consulted.

## Evidence and method

- Primary source: [current Paper Session page](https://app.paper.design/file/01M44G6AG3HPXGPPPMKS9S3H8J/p-3-0), file Argo, token hash `2737d693` throughout this inspection. Loaded the Paper guide, basic info, tokens, trees, JSX with inline styles, computed styles, node measurements, and screenshots.
- Masters inspected: Session Components → Column / Composer → Components / Composer (In a Session, New Session, Sending, Disabled); Components / Composer attachments (Images attached, Image too large, Hover). Exact card/toolbar and attachment JSX supplied the expected values below.
- Actual Session copies inspected: Session Desktop → Session — Desktop, Inspector open (light) → Composer → Card / Textarea / Composer toolbar; corresponding Inspector closed copy; Session Mobile → Session — Phone (light) → Composer (phone) → Card (phone) / Textarea / Composer toolbar. Copy values sampled for the shell agree with the relevant master styles; the Session copies use Stop where the running state requires it. This is not an exhaustive all-copy audit of the whole Paper file.
- Real render: [Composer overview](http://localhost:6008/?path=/story/sessions-composer--overview), then its UI-created isolation tab. All nine overview variations were measured at 1024 × 900 and 390 × 844 in light and dark. Additional widths: 320, 359, 360, 719, 720 px. Widths refer to the standalone story viewport, not Storybook's manager chrome.
- Awaited `document.fonts.ready` before measurement. Confirmed `fontStatus: loaded`. Shell/editor/toolbar CSS reports `animationName: none`; the sending spinner is a perpetual 750 ms animation, so there is no completion to await. Captured it in separate observations, with changing rotation matrices. The browser read-only DOM facade does not expose `document.getAnimations()`; no claim of awaiting that unavailable API is made. Popup/sheet animation was not measured as design evidence. Trigger measurements were taken after dismissal and fresh UI observation.
- Read root AGENTS.md, GLOSSARY.md, docs/agents/paper.md, docs/agents/storybook.md, Expo overview and Uniwind skills plus responsive/theme references. Source remained unverified until its values were compared with the render.
- Proof is in `screenshots/shell/`. Four full-page overview JPEGs contain every requested visible state, with JSON measurement records beside them. Small supplemental screenshots show Fast/High, compact Fast and the second Agent. Paper screenshots are 2×; their pixel dimensions are not used to infer design measurements.

## Actionable visual differences

### 1. Mode leading icon is 2 px smaller than Paper

Paper layer: `Button ghost sm / Mode` → leading SVG, in Components / Composer → New Session, the sending/disabled cards, image cards and the actual Session copies. The SVG's width/height attributes are 14, **but its overriding CSS width and height are 16 px**. The expected effective size is therefore 16 × 16 px. The actual SVG is **14 × 14 px** at every checked width/theme. Phone Mode consequently measures 50 × 44 px instead of Paper's 52 × 44 px; the 12 px chevron, 4 px gap and 10 px side padding otherwise match.

Code: `packages/client/src/components/ComposerConfiguration.tsx:711`, `size-3.5`. Use the effective 16 px design size for the toolbar icon. The popup's icons are outside this report's scope.

Evidence: [Paper phone toolbar](screenshots/shell/paper-images-phone.png), [rendered phone light](screenshots/shell/phone-light-overview.jpg), [rendered desktop light](screenshots/shell/desktop-light-overview.jpg). The exact measured SVG rectangles are in `phone-light-measurements.json` and `desktop-light-measurements.json`.

### 2. Oversized-image warning icon alignment and vector differ

Paper layer: Components / Composer attachments → Image too large → `ComposerImageError / Too large` → SVG. Its frame is 12 × 12 px, `marginTop: 2px`, with parent `alignItems: center`. Paper node measurements put the SVG **3 px below the text line box's top**: SVG world Y 8443.5; text world Y 8440.5. The actual alert uses `items-start`; its SVG and text both begin at Y 1037 in the desktop light measurement (**0 px offset**). The source's `mt-0.5` is absent from the rendered SVG styles, so it does not supply the intended offset on this web render.

The vector also differs: Paper uses viewBox 24, circle `cx=12 cy=12 r=9`, stroke width 1.7, and round-capped `M12 7v6m0 4h.01`; code renders Phosphor WarningCircle's filled viewBox-256 path (outer radius 104, inner radius 88, separate 56-unit stem and 12-unit dot). Both are 12 px warning symbols, but their ring/stem/dot geometry is not identical.

Code: `packages/client/src/components/Composer.tsx:176–180` and the style binding in `packages/client/src/components/Icon.tsx:24–44`. Match the measured 3 px text-relative alignment and the design vector. Preserve the existing short, one-line error and 24 px total vertical contribution.

Evidence: [Paper oversized-image phone](screenshots/shell/paper-error-phone.png), [actual phone dark error/sending](screenshots/shell/phone-dark-error-sending.jpg), [actual desktop light](screenshots/shell/desktop-light-overview.jpg); alert children and rectangles in `desktop-light-measurements.json`. Theme does not account for this geometric difference.

### 3. Remove-image cross uses a different vector

Paper layer: `ComposerImage / Attached` → `Remove attachment / hidden until hover` → Frame → SVG (also the visible phone version). The 32 × 32 target, 18 × 18 background badge, 6 px badge radius, 10 × 10 SVG box and colours match. Paper's cross is a stroked viewBox-24 path `m6 6 12 12M18 6 6 18`, stroke width 2 and round caps. Actual code uses the filled Phosphor X viewBox-256 path, with diagonal endpoints around 50/206. Its arm shape and cross coverage differ despite the matching outer SVG size.

Code: `packages/client/src/components/Composer.tsx:167`, `XIcon`. Match the design's small stroked cross rather than assuming any 10 px X is geometrically equivalent.

Evidence: [Paper images phone](screenshots/shell/paper-images-phone.png), [actual phone light images](screenshots/shell/phone-light-overview.jpg); `phone-light-measurements.json` confirms the matching badge/frame sizes. Actual SVG path was read directly from the rendered DOM.

### 4. Desktop Send receives an extra small shadow

Paper layer: `Button default icon / Send` in New Session and Images attached (wide), and `/ Send (pending)` / `/ Send (disabled)` in the Sending/Disabled masters, has **no boxShadow**. Actual desktop Send has **0 1px 2px rgba(0,0,0,0.05)** from Button's default variant. Paper phone Send and actual Session Stop do specify this small shadow and agree with the code. This is a subtle desktop Send-only difference, not a card-shell shadow defect.

Code: `packages/client/src/primitives/button.tsx:28–30` and `packages/client/src/components/Composer.tsx:310` (the Send/Stop Button). Scope any adjustment to the desktop Send states, preserving the designed phone and Stop shadow.

Evidence: [Paper desktop empty](screenshots/shell/paper-empty-desktop.png), [actual desktop light](screenshots/shell/desktop-light-overview.jpg). JSON button styles provide the measured shadow; Paper JSX supplies its absence.

## Measurements that agree

| Element | Paper expectation | Real rendered observation |
|---|---|---|
| Main card | max width 640; border 1; radius-xl 14; background 80% background; blur 3; saturation 110%; small black 0/1/2 shadow | 640 px on desktop; 358 px in the 390 px story; 1 px, 14 px; 80% semantic surface; blur(3px) saturate(1.1); shadow 0/1/2 at 5% (Paper's alpha byte 0D is approximately 5.1%) |
| Single-line card | desktop 80 high; phone 86 | 80 / 86, in empty, typing, sending, disabled, running, and Session variations |
| Editor wrapper | x 16, top 12; bottom 8 desktop / 4 phone | 16 / 12 / 8 or 4 |
| Editor | desktop SF Pro Text 14/20 normal; phone 16/24 normal; no visible border, fill or shadow | matching effective family, 400 weight, font size and line-height; zero border/padding; transparent; no visible shadow |
| Placeholder | muted-foreground at 70% | light rgba(115,115,115,.7); dark rgba(163,163,163,.7) |
| Multiline | no exact multiline Paper master available; normal line metrics continue | three lines: 60 px editor / 120 px card desktop; 72 / 134 phone; no text overlap or clipping in checked content |
| Desktop toolbar | 38 high; x 10, bottom 10; left gap 2; right gap 4 | 38 / 10 / 10 / 2 / 4 |
| Phone toolbar | 44 high; left 4/right 8; no bottom padding; left gap 2/right gap 4 | matching |
| Attach | desktop 28 × 28, phone 44 × 44; radius 8; Plus 16, muted | matching |
| Agent–Model–Effort trigger | 28 high, x 6, gap 4, radius 8; one 16 px logo; 14/20 normal text; 12 px muted chevron; optional 16 px filled Fast bolt | matching, including direct interaction results below; total width varies with actual text |
| Mode text/chevron | desktop 14/20 normal, phone hidden text; 12 px muted chevron | matching; leading icon discrepancy is finding 1 |
| Send | 28 circle; 16 ArrowUp; primary/primary-foreground; empty/invalid/disabled opacity .35 | matching dimensions, colours, arrow vector and opacity; desktop shadow discrepancy is finding 4 |
| Stop | 28 circle; centered 10 × 10 square, radius 2; full opacity | matching; clicking Stop changes the running variation back to Send (0 Stop / 9 Send after the action) |
| Sending | preserve draft; inactive controls/editor .5; pending button full opacity | matching. Paper sets editor opacity on its wrapper; code on the textarea. Effective visible opacity is the same; this is not a discrepancy |
| Attached images | 160 × 120; border 1; radius 8; top 12/x 16; gap 12; image row above editor | matching in both themes and sizes; desktop image card 212 high / phone 218 |
| Removal | 32 target; 18 badge radius 6; 10 cross; desktop hidden at rest, phone visible | matching except cross vector in finding 3. Desktop hover reveal was not interactively tested; see limitations |
| Oversized image | red 1 px thumbnail border; 12/16 red single-line error; gap 8/x 16; 24 px extra height; Send disabled | matching; desktop 236 high / phone 242. Warning icon differs as in finding 2 |

Light theme semantic values measured: foreground #0a0a0a, muted-foreground #737373, border #e5e5e5, primary #171717, primary-foreground #fafafa, destructive rgb(251,44,54). These correspond to Paper's light palette aliases. Main card/sidebar compositing was checked via CSS, not inferred from screenshot pixels.

Dark values measured: foreground/primary #fafafa, muted-foreground #a3a3a3, border #262626, primary-foreground #171717, background approximately #0a0a0a at 80%, destructive #e14e4e. These match current code semantic dark tokens. The relevant Paper masters and actual Session copies inspected here are light; the file token set supplies no equivalent dark-theme definitions, so dark Paper colour parity is **unverified**, not asserted.

## User overrides and actual trigger verification

- One Agent logo: verified one logo in the closed toolbar for First Agent and Second Agent. Switching Agent through existing product controls yields Opus 5.5 / Medium and GPT-6-Astra / Medium respectively. Different label widths are data, not drift. Paper's High example is not a reason to hardcode High in the product.
- Concrete Effort: selected High for First Agent and Ultra for Second Agent; closed trigger visibly updates to those concrete values. No Auto label is substituted in these checked states.
- Fast: enabling Fast renders the filled 16 px bolt beside the actual Model and High; off renders no bolt. At 320 px, visible trigger children are one logo, Fast bolt and chevron; Model and Effort text are hidden. These behaviours comply with the explicit user overrides.
- Compact phone: at 359 px the visible trigger is logo/chevron; at 360 px Model and Effort text appear. At 719 px editor is 16/24, Attach/Mode are 44 high and card is 86; at 720 px editor switches to 14/20, Attach/Mode to 28 and card to 80. This confirms the code's 720 px responsive boundary and explicit compact variant.
- Error copy is the requested short one-line `Image exceeds 20 MB.` in light and dark.
- Sending spinner is monochrome: 16 px React Native ActivityIndicator, two viewBox-32 circles (r14, stroke4), 20% track and solid arc, stroke primary-foreground. Dark stroke rgb(23,23,23) on the light Send button; no green/blue accent. Its geometry is intentionally represented by a real animated control. Different captured rotation angles are not drift.
- Paper's New Session placeholder `What should the Agent work on?` versus the Storybook default `Message the Agent…` is permitted text variation under docs/agents/paper.md, not a geometry defect.

## Token-level discrepancy

Paper `--font-sans` is `"SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif`; `tooling/uniwind/theme.css:7–9` substitutes a fallback chain with Segoe UI, Roboto, Helvetica, Arial and omits system-ui. Effective font on this Mac render starts with SF Pro Text and matches the design. Record the literal token drift separately; this audit does not claim a visible font defect or prove cross-platform fallback equivalence. Radius calculations resolve to the expected 6/8/10/14 px. Relevant spacing/text/leading and light colour values agree through Tailwind defaults or equivalent palette literals; a literal semantic value versus an equal alias is not a measured colour defect.

## Missing product scope, not small visual drift

Paper also depicts files/mixed attachments, preparation progress, failed upload/Retry and Queued Turns. Current ComposerDraft accepts text and images only; there is no attachment phase/retry or queue representation, and `canSend` forbids send while a Turn runs. These Paper experiences are absent from this component's current product scope and overview coverage. They require capability/domain work rather than spacing repairs. Their interiors/details were not audited here.

## Limitations

- Native iOS/Android previews were not opened or modified. Actual font selection, content-size growth/maximum height, keyboard/safe-area behaviour, image scrolling and native spinner/sheet behaviour are unverified. Web phone width is not proof of native rendering.
- The Storybook wrapper intentionally gives 16 px exterior padding: at 390 px it renders a 358 px card, matching the attachment master sample. The actual Paper Session phone copy is 374 px with an 8 px Session exterior inset. This component overview cannot verify that integrated Session placement.
- Every requested base visible state was checked in both themes and both main widths, but every state was not repeated for Second Agent, every Mode, every Effort, or long Model names. First/Second Agent, High/Ultra and Fast are targeted interactive checks, not exhaustive catalog coverage.
- No native hover verification, no keyboard focus appearance comparison, and no desktop thumbnail hover transition timing check. At rest desktop removal opacity 0 and phone opacity 1 were measured; hover/focus reveal classes were inspected only.
- No animation tests were added or executed. All scoped geometry is static CSS except the perpetual sending spinner; finite popup/sheet transitions and footer animations are outside this audit.
- No exact Paper multiline editor or dark Composer master was identified. These renders were checked for current token use, legibility, sizes and clipping, with those design-parity claims left unverified.
- The Paper screenshot placeholder images and red Storybook mock images differ in content; replacing mock content is not a product design mismatch. The attachment border/frame/cover geometry was measured directly.

