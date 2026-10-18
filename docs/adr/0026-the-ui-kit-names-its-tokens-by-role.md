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
| `medium` | 600–1099 | Phone shell: drawer and drill-in; Inspector as a sheet (amended 2026-10-18) |
| `wide` | ≥ 1100 | Rail, list, detail and Inspector as its own column |

Phones are always `compact`, even in landscape. Tablets, desktop and web take their size class from window width. `useWide()` becomes `useSizeClass()`, used inside the kit only.

Owner amendment, 2026-10-18 (decision B): `medium` uses the phone shell on every platform (iOS, Android, web and desktop): the drawer in front of the pages, stack navigation, native headers on native, sheets in place of trigger popovers (centred modals on the web), and the Inspector as a sheet. The sidebar beside the content starts at `wide`. The size-class widths are unchanged; only the shell switch moves from `medium` to `wide`. Text follows the platform, not the shell: at `medium` the web and desktop keep the desktop type scale and native keeps the phone scale. Tablets rotate (iPad and Android), and a tablet in landscape can reach `wide`; phones stay in portrait.

Typography keeps its nine text roles and icons keep the roles of ADR-0019.

## Considered options

- Keep the shadcn names: `accent` would keep meaning a grey hover fill, and plugins would inherit the clash.
- Name tokens per component: the kit could not share states and surfaces, and plugins would depend on Argo's internals.
