import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { page } from 'vitest/browser';
import { createSessionCountsMock } from '../../mocks/session-counts-mock';
import { sessionListMocks } from '../../mocks/session-list-mock';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { Text } from '../primitives/text';
import { DesktopLayout } from './desktop-layout';

const recorder = createNavigationRecorder();
const counts = createSessionCountsMock({ attention: 1, running: 1 });
const meta = {
  title: 'Tests/DesktopLayout',
  component: DesktopLayout,
  args: {
    destination: { to: 'sessions' },
    children: <Text testID="detail-content">Detail</Text>,
  },
  render: (args): React.JSX.Element => (
    <View className="h-[700px] w-full">
      <DesktopLayout {...args} />
    </View>
  ),
  parameters: { navigation: recorder, trpc: sessionListMocks },
  beforeEach: async (): Promise<void> => {
    recorder.reset();
    await page.viewport(1440, 844);
  },
} satisfies Meta<typeof DesktopLayout>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RailOpensSectionLists: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByTestId('detail-content')).toBeVisible();
    // The Sessions list puts its search and filter in the sidebar's one header row.
    await expect(
      await canvas.findByRole('button', { name: 'Search Sessions' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Filter Sessions' }),
    ).toBeVisible();
    await expect(
      canvas.getAllByRole('heading', { name: 'Sessions', level: 1 }),
    ).toHaveLength(1);
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
  play: async ({ canvas, userEvent }) => {
    await expect(
      await canvas.findByRole('button', { name: 'Accounts' }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      canvas.getByRole('heading', { name: 'Accounts' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Connection' }));
    await expect(recorder.destinations).toEqual([
      { to: 'settings-connection' },
    ]);
  },
};

export const DetailTitleFollowsDestination: Story = {
  args: { destination: { to: 'settings-connection' } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Connection' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Connection' }),
    ).toHaveAttribute('aria-selected', 'true');
  },
};

export const IssuesListPlaceholder: Story = {
  args: { destination: { to: 'issues' } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('Issues list will appear here.'),
    ).toBeVisible();
  },
};

export const RailBadgeFollowsSessionCounts: Story = {
  parameters: { trpc: counts.fixtures },
  beforeEach: () => counts.reset(),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByLabelText('1 Session needs attention'),
    ).toHaveTextContent('1');
    counts.publish({ attention: 3, running: 0 });
    await expect(
      await canvas.findByLabelText('3 Sessions need attention'),
    ).toHaveTextContent('3');
    counts.publish({ attention: 0, running: 0 });
    await waitFor(() =>
      expect(canvas.queryByLabelText(/need(s)? attention/)).toBeNull(),
    );
  },
};
