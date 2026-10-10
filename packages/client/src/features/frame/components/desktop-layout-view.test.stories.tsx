import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import { Text } from '#lib/generic/primitives/text';
import { createNavigationRecorder } from '../../../../mocks/with-navigation-mocks';
import {
  DesktopLayoutView,
  type DesktopLayoutViewProps,
} from './desktop-layout-view';
import { LayoutListMock } from './layout-list.mocks';

const recorder = createNavigationRecorder();
const meta = {
  title: 'Tests/DesktopLayoutView',
  component: DesktopLayoutView,
  args: {
    destination: { to: 'sessions' },
    attentionCount: 0,
    list: <LayoutListMock name="Section" />,
    children: <Text testID="detail-content">Detail</Text>,
  },
  render: (args): React.JSX.Element => (
    <View className="h-[700px] w-full">
      <DesktopLayoutView {...args} />
    </View>
  ),
  parameters: { navigation: recorder },
  beforeEach: async (): Promise<void> => {
    recorder.reset();
    await page.viewport(1440, 844);
  },
} satisfies Meta<DesktopLayoutViewProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RailOpensSectionLists: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByTestId('detail-content')).toBeVisible();
    await expect(await canvas.findByText('Section list')).toBeVisible();
    for (const section of ['Issues', 'Atlas', 'Settings', 'Sessions'])
      await userEvent.click(
        canvas.getByRole('button', { name: new RegExp(`^${section}$`) }),
      );
    await expect(recorder.destinations).toEqual([
      { to: 'issues' },
      { to: 'atlas' },
      { to: 'settings' },
      { to: 'sessions' },
    ]);
  },
};

export const SettingsRootSelectsAccounts: Story = {
  args: { destination: { to: 'settings' } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Accounts' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Settings' }),
    ).toHaveAttribute('aria-selected', 'true');
  },
};

export const DetailTitleFollowsDestination: Story = {
  args: { destination: { to: 'settings-connection' } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Connection' }),
    ).toBeVisible();
  },
};

export const RailBadgeShowsAttention: Story = {
  args: { attentionCount: 3 },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByLabelText('3 Sessions need attention'),
    ).toHaveTextContent('3');
  },
};

export const RailBadgeHiddenWithoutAttention: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByTestId('detail-content')).toBeVisible();
    await expect(canvas.queryByLabelText(/need(s)? attention/)).toBeNull();
  },
};
