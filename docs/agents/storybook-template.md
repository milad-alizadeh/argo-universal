# Story file template

The shape every presentation story file takes ([ADR-0040](../adr/0040-one-shape-for-a-story.md)). Copy it; the reasons are in [storybook.md](storybook.md).

Start from the generator, which reads the component's folder and writes this shape:

```bash
pnpm new:story packages/kit/src/primitives/actions/button/button.tsx
```

It derives the title from the path and sets `component:`. It takes `argTypes` from a kit component's Contracts schema, or from any other component's own `<Component>Props` type. It gives each required prop a placeholder arg, and `fn()` for a handler. Then it writes one story per value in the component's `cva` or `tailwind-variants` maps, named for the value. Where a value name reads as a prop value rather than a state, such as `Sm`, rename the story for what it shows. Add by hand only what it cannot see: a branch in a conditional, a lookup table or a platform fork, and a pair the component has a rule for.

## A kit primitive

```tsx
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Button } from './button';

const meta = {
  // Derived from the path: primitives/<category>/<name> inside the kit.
  title: 'Design System/Primitives/Actions/Button',
  component: Button,
  // Placeholder copy, never product copy. A prop with no branch stays an arg here.
  args: { label: 'Label' },
  // The prop domain, from the kit component's Contracts schema.
  argTypes: kitArgTypes('Button'),
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

// One story per branch in the variants map, named for the value.
export const Primary: Story = { args: { variant: 'primary' } };

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Text: Story = { args: { variant: 'text' } };

export const Danger: Story = { args: { variant: 'danger' } };

export const Small: Story = { args: { size: 'sm' } };

export const Disabled: Story = { args: { disabled: true } };

// A pair earns a story only because the component has a rule for it: a disabled danger button reads as disabled, not as danger.
export const DisabledDanger: Story = {
  args: { variant: 'danger', disabled: true },
};
```

No `WithIcon` or `SizeSm`: a story named after a prop is an arg. No `render:` gallery: the Docs page shows every story in order above the props table.

## A child and its parent (a feature component)

The child exports each of its states as a fixture, beside its story file:

```tsx
// check-mark-fixtures.ts
import type { CheckMarkProps } from './check-mark';

export const passingCheck = {
  name: 'Lint',
  state: 'passed',
} satisfies CheckMarkProps['check'];

export const failingCheck = {
  name: 'Lint',
  state: 'failed',
} satisfies CheckMarkProps['check'];
```

```tsx
// check-mark.stories.tsx
const meta = {
  title: 'Workbench/CheckMark',
  component: CheckMark,
  argTypes: { check: { control: false } },
} satisfies Meta<typeof CheckMark>;

export const Passed: Story = { args: { check: passingCheck } };

export const Failed: Story = { args: { check: failingCheck } };
```

The parent imports them and varies only its own props:

```tsx
// change-row.stories.tsx
import { failingCheck, passingCheck } from '../check-mark/check-mark-fixtures';

const meta = {
  title: 'Workbench/ChangeRow',
  component: ChangeRow,
  args: { title: 'Title', checks: [passingCheck] },
  argTypes: { stage: { control: 'select', options: ['open', 'merged'] } },
} satisfies Meta<typeof ChangeRow>;

export const Open: Story = { args: { stage: 'open' } };

export const Merged: Story = { args: { stage: 'merged' } };

/*
 * No Failing or Running story: a failing check changes nothing outside
 * CheckMark's own box, so CheckMark's stories own it. ManyChecks is here
 * because enough checks wrap the row, which is ChangeRow's own layout.
 */
export const ManyChecks: Story = {
  args: { checks: [passingCheck, failingCheck, passingCheck, failingCheck] },
};
```

`args: { checks: [failingCheck] }` is how a parent shows a child in a state; it never writes `{ state: 'failed' }` inline.
