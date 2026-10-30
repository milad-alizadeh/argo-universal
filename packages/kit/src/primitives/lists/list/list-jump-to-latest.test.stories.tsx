import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn } from 'storybook/test';
import {
  LiquidGlass,
  LiquidGlassPlatform,
} from '#primitives/content/liquid-glass';
import {
  nativeGlassFixture,
  nativeMaterialLabel,
  opaqueMaterialLabel,
} from '../../content/liquid-glass/liquid-glass-native-contract.mocks';
import { JumpToLatestButton } from './list-jump-to-latest';

const native = nativeGlassFixture();

const newRowsLabel = 'Jump to latest, new rows';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/ListJumpToLatest',
  tags: ['!dev'],
  beforeEach: (): void => native.change(false),
  globals: { mode: 'light' },
  args: { hasNewRows: true, onPress: fn() },
  render: (args): ReactElement => (
    <LiquidGlassPlatform value={native.platform}>
      <JumpToLatestButton {...args} />
    </LiquidGlassPlatform>
  ),
} satisfies Meta<typeof JumpToLatestButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SupportedPlatformDrawsSystemGlass: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('group', { name: nativeMaterialLabel }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: newRowsLabel }),
    ).toBeVisible();
  },
};

export const ReduceTransparencyDrawsTheOpaqueMaterial: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await canvas.findByRole('group', { name: nativeMaterialLabel });
    native.change(true);
    await expect(
      await canvas.findByRole('group', { name: opaqueMaterialLabel }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: newRowsLabel }));
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};

export const UnsupportedPlatformDrawsTheSharedFallback: Story = {
  render: (args): ReactElement => <JumpToLatestButton {...args} />,
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.queryByRole('group')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: newRowsLabel }));
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};

export const InheritsAParentThatOwnsTheMaterial: Story = {
  render: (args): ReactElement => (
    <LiquidGlassPlatform value={native.platform}>
      <LiquidGlass corners="sheet">
        <JumpToLatestButton {...args} hasNewRows={false} />
      </LiquidGlass>
    </LiquidGlassPlatform>
  ),
  play: async ({ canvas }) => {
    await canvas.findByRole('group', { name: nativeMaterialLabel });
    await expect(canvas.getAllByRole('group')).toHaveLength(1);
    await expect(
      canvas.getByRole('button', { name: 'Jump to latest' }),
    ).toBeVisible();
  },
};
