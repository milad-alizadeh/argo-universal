# The story template

The shape of every story file ([ADR-0040](../adr/0040-one-shape-for-a-story.md)). Copy the flavour that fits and fill it in; `docs/agents/storybook.md` holds the rules behind it.

Run the generator first, then edit what it wrote:

```bash
pnpm new:story packages/client/src/lib/generic/primitives/status/pill/pill.tsx
```

It derives the title from the path, reads the component's props type and its variants map, and writes one story per branch, named for the branch value. It never invents a prop value and never a combination. What it leaves you: naming the states for what they show, and adding the pair story where the component has a rule for the pair.

## A kit primitive

```tsx
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#lib/generic/kit-arg-types';
import { Pill } from './pill';

const meta = {
  // Derived from the path: `primitives/status/pill/` is always four segments.
  title: 'Design System/Primitives/Status/Pill',
  // The Docs page's props table hangs off `component:`; without it there is no table.
  component: Pill,
  // Placeholder copy, never Sessions, Projects or Agents copy: product copy must not reach the kit.
  args: { text: 'Ready' },
  // A kit component's props come from its Contracts schema, so the table cannot drift from the component.
  argTypes: kitArgTypes('Pill'),
} satisfies Meta<typeof Pill>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * One story per branch in the component's own source: `tone` keys Pill's `fills` and `textTones` tables,
 * so each of its eight values is a state. `text` and `color` key nothing, so they stay args and Controls covers them.
 */
export const Neutral: Story = { args: { tone: 'neutral' } };

export const Accent: Story = { args: { tone: 'accent' } };

export const Danger: Story = { args: { tone: 'danger' } };
```

The kit path above is `packages/client/src/lib/generic` until [#1210](https://github.com/milad-alizadeh/argo-universal/issues/1210) moves the kit to `packages/kit`; the generator reads the path it is given, so nothing here is pinned to either.

## A feature component that contains another

```tsx
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
// A child's states are exported fixtures. The parent imports one; it never says inline what "failing" means.
import { failingChecks } from '../pull-request-checks/pull-request-checks.fixtures';
import { WorkbenchChangesCard } from './workbench-changes-card';

const meta = {
  // A feature's components group under the feature's own name.
  title: 'Sessions/WorkbenchChangesCard',
  component: WorkbenchChangesCard,
  // A view's callbacks are spies; a story that only logs an action is a functionality test, not a state.
  args: { checks: failingChecks, onOpenStage: fn() },
  argTypes: {
    collapsed: { control: 'boolean' },
    density: { control: 'select', options: ['regular', 'compact'] },
  },
} satisfies Meta<typeof WorkbenchChangesCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * The card's own branches, and only those: collapsing changes its composition, and so does overflowing
 * past three rows. It has no `ChecksRunning`, `ChecksFailing` or `ChecksPassed` story — a Check's result
 * changes nothing outside the child's own box, so those states belong to PullRequestChecks (ADR-0040).
 */
export const Collapsed: Story = { args: { collapsed: true } };

export const Compact: Story = { args: { density: 'compact' } };

export const Overflowing: Story = { args: { rows: manyRows } };
```

## What the generator cannot write

- **A pair story.** A pair earns one only where the component has a rule for the pair. Button has one — a destructive button is transparent whatever its variant (`button-content-styles.ts:110`) — so it gets `DestructiveGhost` by hand, and nothing else gets a pair.
- **A screen's title.** `Screens/<Section>/<Page>` carries the product's section and the page's visible title, which the path does not know. The generator says so when it writes one.
- **A better name than the branch value.** `Danger` is what the branch is called; `Destructive` is what it shows. Rename it. A name that repeats a prop (`WithIcon`, `SizeSm`, `FullWidthTrue`) means you are looking at an arg.
