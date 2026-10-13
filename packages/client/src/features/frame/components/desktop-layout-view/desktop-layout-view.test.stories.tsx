import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import { SessionHeader } from '#features/sessions';
import { Text } from '#lib/generic/primitives/display/text/text';
import { createNavigationRecorder } from '../../../../../mocks/with-navigation-mocks';
import { LayoutListMock } from '../layout-list.mocks';
import {
  DesktopLayoutView,
  type DesktopLayoutViewProps,
} from './desktop-layout-view';

const recorder = createNavigationRecorder();

const expanded = 'aria-expanded';

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

export const SettingsRootMarksSettingsCurrent: Story = {
  args: { destination: { to: 'settings' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Detail')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Settings' }),
    ).toHaveAttribute('aria-current', 'page');
  },
};

// Every page draws its own header, so the shell adds no title above the detail page.
export const ShellDrawsNoPageTitle: Story = {
  args: { destination: { to: 'settings-agent-new' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Detail')).toBeVisible();
    await expect(
      canvas.queryByRole('heading', { name: 'Add custom Agent' }),
    ).toBeNull();
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

// The open Session's Changes button opens the Inspector beside it and closes it again.
export const ChangesOpensInspector: Story = {
  args: {
    destination: { to: 'session', id: 'session-1' },
    children: (
      <SessionHeader title="Fix login" status="idle" startedAt={null} />
    ),
  },
  play: async ({ canvas, userEvent }) => {
    const changes = await canvas.findByRole('button', { name: 'Changes' });
    await expect(changes).toHaveAttribute(expanded, 'false');
    await userEvent.click(changes);
    await expect(changes).toHaveAttribute(expanded, 'true');
    await expect(
      await canvas.findByRole('heading', { name: 'Changes' }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Close Inspector' }),
    );
    await expect(changes).toHaveAttribute(expanded, 'false');
  },
};

const longTitle =
  'Build the Session layout from spec 0003, wire the Inspector to the changed files and keep the Composer pinned to the bottom of the window';

// The Session header keeps a long title on one line with its whole text in the heading's name, and never covers the header actions, with the Inspector closed or open.
export const LongSessionTitle: Story = {
  args: {
    destination: { to: 'session', id: 'session-1' },
    children: (
      <SessionHeader title={longTitle} status="idle" startedAt={null} />
    ),
  },
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('heading', { name: longTitle });
    const changes = canvas.getByRole('button', { name: 'Changes' });
    const lineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight);

    for (const open of [false, true]) {
      if (open) {
        await userEvent.click(changes);
        await expect(changes).toHaveAttribute(expanded, 'true');
      }

      await expect(heading.getBoundingClientRect().height).toBeLessThan(
        lineHeight * 1.5,
      );
      await expect(heading.getBoundingClientRect().right).toBeLessThanOrEqual(
        changes.getBoundingClientRect().left,
      );
    }
  },
};
