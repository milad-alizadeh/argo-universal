# The UI kit names its tokens by role

The UI kit names its design tokens by the role they play, not by where shadcn put them (owner, 2026-10-14, Spec 0015 #724). Today's names in `tooling/uniwind/theme.css` came from React Native Reusables and clash with ours: `accent` is a grey hover fill while Argo calls its colour `tint`. Screens, and later plugins, are built from these names, so they are written down here and change only by a new ADR.

## Colour roles

Each role has a light and a dark value.

| Role | Use |
| --- | --- |
| `content` | The one content surface behind pages, on phone and desktop (today `sidebar`) |
| `card` | Cards on the content surface |
| `foreground` | Body text and icons |
| `muted-foreground` | Secondary text |
| `muted` | Quiet fills (today `secondary` and `muted`, merged) |
| `accent` | Argo's colour (today `tint`) |
| `primary` | Primary buttons |
| `border` | The faint outer edge of a surface |
| Tones | `info`, `success`, `warning`, `danger` (today `destructive`), `done` (today `merged`): each names a meaning, never a feature. `danger` covers errors and destructive actions; `done` is finished work, such as a merged pull request or a completed issue |

`chart-1` to `chart-5` are deleted. The `spacing-shell-*`, `spacing-session-*` and `spacing-plan-proposal` tokens are debt: each folds into the spacing scale or moves into its one component.

## Canvas tone shades

Owner amendment, 2026-10-19 (#836): Canvas `intensity` uses nine shade tokens per tone, from `--color-tone-<tone>-100` through `-900`.
An intensity of 0 selects 100; 1 selects 900. Intermediate values select the nearest step.
`neutral`, `muted` and `accent` use the neutral palette. `info`, `success`, `warning`, `danger` and `done` use blue, green, amber, red and violet.
Light mode uses palette shades 100 through 900. Dark mode reverses that order, so stronger intensity remains easier to see.
Without `intensity`, a drawing uses its existing semantic tone token.
Plugins cannot set colours or add tokens, except a colour that is data (Colour as data, below).

## Hue tones

Owner amendment, 2026-11-14 (#2122): two tones are named by hue, `teal` and `pink`, because they carry no meaning. They exist to tell one mark from another once the tones that name a meaning are spent: the six Agent roles each draw a mark in a colour of their own, with Implement in teal and General in pink, so no role mark is grey.
Each has the nine shade tokens, `--color-tone-<tone>-100` through `-900`, reversed in dark mode as the others are.
Only marks take them: the tinted avatar, the tone mark and the leading mark of `FieldGroup.Link`, which the phone's Agents list draws through. A Plugin can therefore choose either hue for a leading mark, as it chooses any other tone there. Canvas `intensity`, `Text` and `Icon` do not take them.
Orange was rejected as too close to amber, and red stays `danger`.

## Colour as data

Owner amendment, 2026-11-20: a Plugin may pass a colour when the colour is the data itself, such as a light's colour, a calendar's or a label's. Tones still name meanings, and everything else still takes them. A second owner amendment the same day adds `Fader` `fill`: a Fader is a range control whose surface holds any kit content, its fill showing the value as a share of the range.
- A colour is sRGB hex, `#RRGGBB`. Anything else is rejected with the node.
- The Kit takes one to four stops on these props: `Swatch` `colors`, a dot filled with the colours; `Slider` `fill`, the filled part of its track; `Fader` `fill`, the filled part of the Fader's surface, and `GradientTile` `fill`, the colour data for a tile such as a Hue scene.
- The App draws a colour as given in light and dark mode and keeps what sits on it readable: a Swatch has no text on it, a Slider's thumb stays the platform's own, and the Fader and GradientTile choose a dark or light foreground from the luminance of their fills.
- A `Swatch` draws its stops as a gradient on every platform. A `Slider` `fill` draws its stops as a gradient on the web; iOS and Android draw the first stop alone, since their native sliders take one colour. A `Fader` is the App's own view, not a native control, so it draws its stops as a gradient on every platform, along its direction. A GradientTile draws its stops across its surface on every platform.
- `Text`, `Icon`, `Card` and `Surface` still take tones only, and `className` and `style` stay rejected (ADR-0025).

## States

Every interactive component draws the same five states from shared tokens: `hover`, `pressed`, `selected` (flat tints), `focus` (today `ring`) and `disabled`.

Owner amendment, 2026-10-15: interaction fills have separate `hover`, `selected` and `pressed` tokens. In light mode they use black at 2%, 3% and 4%; dark mode uses white at 4%, 6% and 8%. Hover also marks the focused menu option. Quiet field fills stay `muted`, and outlines stay `border`. Native controls retain their platform state drawings through public APIs. Destructive actions keep their danger tint.

## Shape, surfaces and density

- **Shape:** `sm`, `md`, `lg`, `xl`, `2xl`, `full`, plus `control` and `sheet`. On web and desktop, `control` (the `lg` radius) rounds buttons and inputs, `xl` rounds menu and popover rows, `2xl` is the card, popover and menu radius, `full` rounds pills, and `sheet` rounds sheets. Phones keep their stock shapes.
- **Surfaces:** `card` (the Composer and request cards too), `tray` (the Composer envelope), `glass` and `overlay` (popovers and menus). `card`, `tray` and `glass` each pair a fill with the shadow of the same name; `overlay` uses the `card` fill with `shadow-card` on desktop and `shadow-raised` on phones. iOS 26 draws `glass` with system Liquid Glass, Android uses tonal surfaces, and shadows draw on web and desktop only.
- **Density:** `default` and `compact`.

## Size classes

| Size class | Window width | Layout |
| --- | --- | --- |
| `compact` | < 600 | Phone: drawer and drill-in |
| `medium` | 600–1099 | Phone shell: drawer and drill-in; Workbench as a sheet (amended 2026-10-18) |
| `wide` | ≥ 1100 | Rail, list, detail and Workbench as its own column |

Phones are always `compact`, even in landscape. Tablets, desktop and web take their size class from window width. `useWide()` becomes `useSizeClass()`, used inside the kit only.

Owner amendment, 2026-10-18 (decision B): `medium` uses the phone shell on every platform (iOS, Android, web and desktop): the drawer in front of the pages, stack navigation, native headers on native, sheets in place of trigger popovers (centred modals on the web), and the Workbench as a sheet. The sidebar beside the content starts at `wide`. The size-class widths are unchanged; only the shell switch moves from `medium` to `wide`. Text follows the platform, not the shell: at `medium` the web and desktop keep the desktop type scale and native keeps the phone scale. Tablets rotate (iPad and Android), and a tablet in landscape can reach `wide`; phones stay in portrait.

Typography keeps its nine text roles, plus `code-inline`, and icons keep the roles of ADR-0019.

Owner amendment, 2026-11-02: each platform takes its own scale through the same roles, set only as token overrides in the theme. Body, Heading and row titles are 17/24 on iOS, 16/24 on Android and 13/20 on the web and desktop; Secondary and row details are 15/20, 14/20 and 12/16. Android adds Material's tracking, +0.5 on Body and +0.25 on Secondary. `code-inline` is code inside a sentence, one point under the text around it. In light mode `danger` and `warning` text uses the 700 shades, so it reads at small sizes.

## Considered options

- Keep the shadcn names: `accent` would keep meaning a grey hover fill, and plugins would inherit the clash.
- Name tokens per component: the kit could not share states and surfaces, and plugins would depend on Argo's internals.
