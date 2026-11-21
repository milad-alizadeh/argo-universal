import type { PageEvent } from '@repo/contracts/plugins/page-calls';
import { WireNode } from '@repo/contracts/plugins/wire';
import { Skeleton } from '@repo/kit/primitives/status/skeleton';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Fader',
  render: (): React.JSX.Element => (
    <PluginTree root={page} onPageCall={onPageCall} />
  ),
  beforeEach: (): void => {
    onPageCall.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// A node is its type and key, its props and its children.
const node = (
  [type, key]: [string, string],
  props: WireNode['props'],
  children: WireNode[] = [],
): WireNode => ({ type, key, props, children, slots: {} });

const label = 'Ceiling brightness';

// A light's tile as a Plugin sends it: a Fader holding a name, a button and the value.
const tile = node(
  ['Fader', 'ceiling'],
  {
    value: 80,
    minimumValue: 0,
    maximumValue: 100,
    step: 1,
    accessibilityLabel: label,
    valueLabel: '80%',
    fill: ['#FF8A3D', '#FFD08A'],
    onValueChange: { bind: 'level' },
  },
  [
    node(['Text', 'name'], { children: 'Ceiling', role: 'row' }),
    node(['IconButton', 'power'], {
      icon: 'plug',
      accessibilityLabel: 'Ceiling power',
      onPress: { pageState: { on: false } },
    }),
  ],
);

const page = WireNode.parse(
  node(['Grid', 'grid'], { columns: 2, gap: 3 }, [tile]),
);

const onPageCall = fn(async () => {});

export const FaderDrawsItsContent: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('slider', { name: label })).toHaveAttribute(
      'aria-valuenow',
      '80',
    );
    await expect(canvas.getByText('Ceiling')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Ceiling power' }),
    ).toBeVisible();
  },
};

export const FaderKeyDispatchesItsValue: Story = {
  play: async ({ canvas, userEvent }) => {
    const fader = canvas.getByRole('slider', { name: label });

    fader.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(onPageCall).toHaveBeenCalledWith(
      { bind: 'level' },
      expect.objectContaining<Partial<PageEvent>>({ payload: 79 }),
    );
  },
};

export const LoadingFaderKeepsTheShellWithoutItsFill: Story = {
  render: () => (
    <Skeleton loading>
      <PluginTree root={page} onPageCall={onPageCall} />
    </Skeleton>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByRole('slider')).not.toBeInTheDocument();
    await expect(canvasElement.querySelector('linearGradient')).toBeNull();
  },
};
