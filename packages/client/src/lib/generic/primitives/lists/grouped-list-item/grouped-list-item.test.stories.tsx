import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListItem } from './grouped-list-item';

const onPress = fn<() => void>();

const meta = {
  title: 'Tests/GroupedListItem',
  component: GroupedListItem,
  args: {
    label: 'Projects',
    value: '1',
    needsAttention: true,
    onPress,
    href: '/settings/projects',
  },
  render: (args): React.JSX.Element => (
    <GroupedList>
      <GroupedListSection title="Server">
        <GroupedListItem {...args} />
        <GroupedListItem label="Version" value="1.0" />
        <GroupedListItem
          label="Agents"
          value="2"
          disabled
          onPress={onPress}
          href="/settings/agents"
        />
        <GroupedListItem
          label="Connection"
          value="Direct"
          onPress={onPress}
          href="/settings/connection"
        />
      </GroupedListSection>
    </GroupedList>
  ),
  beforeEach: (): void => {
    onPress.mockClear();
  },
} satisfies Meta<typeof GroupedListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const KeyboardAndAccessibleNames: Story = {
  play: async ({ canvas, userEvent }) => {
    const projects = canvas.getByRole('link', {
      name: 'Projects, 1, needs attention',
    });

    await expect(canvas.getAllByRole('link')).toHaveLength(3);
    await expect(
      canvas.getByRole('group', { name: 'Version, 1.0' }),
    ).toBeInTheDocument();
    await userEvent.tab();
    await expect(projects).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(onPress).toHaveBeenCalledOnce();
    await userEvent.tab();
    await expect(
      canvas.getByRole('link', { name: 'Connection, Direct' }),
    ).toHaveFocus();
    await expect(
      canvas.getByRole('link', { name: 'Agents, 2' }),
    ).toHaveAttribute('aria-disabled', 'true');
  },
};

// A count badge draws its count, capped at 99+, and the row's name says it the screen's way; zero draws nothing.
export const BadgeCount: Story = {
  render: (): React.JSX.Element => (
    <GroupedList>
      <GroupedListSection>
        <GroupedListItem
          label="Inbox"
          badge={120}
          badgeLabel="120 unread"
          onPress={onPress}
        />
        <GroupedListItem label="Drafts" badge={0} onPress={onPress} />
      </GroupedListSection>
    </GroupedList>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Inbox, 120 unread' }),
    ).toHaveTextContent('99+');
    await expect(
      canvas.getByRole('link', { name: 'Drafts' }),
    ).not.toHaveTextContent('0');
  },
};

// The dot names its status without drawing the status label as a value.
export const DescriptionAndStatus: Story = {
  render: (): React.JSX.Element => (
    <GroupedList>
      <GroupedListSection>
        <GroupedListItem
          label="Codex"
          subtitle={{ text: 'Coding assistant' }}
          status={{ tone: 'warning', label: 'Update available' }}
          onPress={onPress}
        />
        <GroupedListItem label="goose" onPress={onPress} />
      </GroupedListSection>
    </GroupedList>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', {
        name: 'Codex, Coding assistant, Update available',
      }),
    ).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'goose' })).toBeVisible();
    await expect(
      canvas.queryByText('Update available'),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByText('Not installed')).not.toBeInTheDocument();
  },
};

export const SidebarSelection: Story = {
  render: (): React.JSX.Element => (
    <GroupedList variant="sidebar">
      <GroupedListSection>
        <GroupedListItem
          label="Projects"
          value="1"
          onPress={onPress}
          href="/settings/projects"
        />
        <GroupedListItem
          label="Connection"
          value="This Mac"
          selected
          onPress={onPress}
          href="/settings/connection"
        />
      </GroupedListSection>
    </GroupedList>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Connection, This Mac' }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(
      canvas.getByRole('link', { name: 'Projects, 1' }),
    ).not.toHaveAttribute('aria-current');
  },
};
