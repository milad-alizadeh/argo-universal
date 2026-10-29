import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { Pill } from '#primitives/status/pill';
import { LiquidGlass } from './liquid-glass';
import {
  nativeGlassFixture,
  nativeMaterialLabel,
  opaqueMaterialLabel,
} from './liquid-glass-native-contract.mocks';
import { LiquidGlassPlatform } from './liquid-glass-platform';

const native = nativeGlassFixture();

const meta = {
  title: 'Tests/Design System/Primitives/Content/LiquidGlass/NativeContract',
  tags: ['!dev'],
  beforeEach: (): void => native.change(false),
  globals: { mode: 'light' },
  render: (): ReactElement => (
    <LiquidGlassPlatform value={native.platform}>
      <LiquidGlass corners="pill">
        <Text>Native material content</Text>
      </LiquidGlass>
    </LiquidGlassPlatform>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const SupportedMaterialUsesRegularGlass: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('group', { name: nativeMaterialLabel }),
    ).toBeVisible();
  },
};

export const NestedControlInheritsTheMaterial: Story = {
  render: (): ReactElement => (
    <LiquidGlassPlatform value={native.platform}>
      <LiquidGlass corners="sheet">
        <LiquidGlass corners="pill" inherit>
          <Text>Inherited material</Text>
        </LiquidGlass>
      </LiquidGlass>
    </LiquidGlassPlatform>
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(
        canvas.getAllByRole('group', { name: nativeMaterialLabel }),
      ).toHaveLength(1),
    );
    await expect(canvas.getByText('Inherited material')).toBeVisible();
  },
};

export const ReduceTransparencyChangesToFallback: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('group', { name: nativeMaterialLabel });
    native.change(true);
    await expect(
      await canvas.findByRole('group', { name: opaqueMaterialLabel }),
    ).toBeVisible();
    await expect(canvas.getByText('Native material content')).toBeVisible();
  },
};

export const ExplicitFallbackDisablesTheGlassEffect: Story = {
  render: (): ReactElement => (
    <LiquidGlassPlatform value={native.platform}>
      <LiquidGlass corners="pill" glass={false}>
        <Text>Opaque material</Text>
      </LiquidGlass>
    </LiquidGlassPlatform>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Opaque material')).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: opaqueMaterialLabel }),
    ).toBeVisible();
  },
};

export const UnsupportedPlatformKeepsTheContent: Story = {
  render: (): ReactElement => (
    <LiquidGlass corners="pill">
      <Text>Fallback material</Text>
    </LiquidGlass>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Fallback material')).toBeVisible();
    await expect(
      canvas.queryByRole('group', { name: nativeMaterialLabel }),
    ).toBeNull();
  },
};

export const PreferenceChangePreservesEditableState: Story = {
  render: (): ReactElement => (
    <LiquidGlassPlatform value={native.platform}>
      <LiquidGlass corners="sheet">
        <input aria-label="Draft" defaultValue="Preserved draft" />
      </LiquidGlass>
    </LiquidGlassPlatform>
  ),
  play: async ({ canvas }) => {
    await canvas.findByRole('group', { name: nativeMaterialLabel });
    const input = canvas.getByRole('textbox', { name: 'Draft' });
    input.focus();
    native.change(true);
    await canvas.findByRole('group', { name: opaqueMaterialLabel });
    await expect(input).toHaveValue('Preserved draft');
    await expect(input).toHaveFocus();
  },
};

export const OnlyExplicitFloatingPillsDrawTheirOwnMaterial: Story = {
  render: (): ReactElement => (
    <LiquidGlassPlatform value={native.platform}>
      <View>
        <LiquidGlass corners="sheet">
          <Pill variant="control" text="Menu choice" />
        </LiquidGlass>
        <Pill variant="control" appearance="glass" text="Floating status" />
      </View>
    </LiquidGlassPlatform>
  ),
  play: async ({ canvas }) => {
    const status = canvas.getByRole('button', { name: 'Floating status' });
    await within(status).findByRole('group', { name: nativeMaterialLabel });
    const menu = canvas.getByRole('button', { name: 'Menu choice' });
    await expect(within(menu).queryByRole('group')).toBeNull();
    await expect(canvas.getAllByRole('group')).toHaveLength(2);
  },
};
