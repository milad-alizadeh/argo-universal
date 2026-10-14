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
    title: 'Projects',
    value: '1',
    needsAttention: true,
    onPress,
    href: '/settings/projects',
  },
  render: (args): React.JSX.Element => (
    <GroupedList>
      <GroupedListSection title="Server">
        <GroupedListItem {...args} />
        <GroupedListItem title="Version" value="1.0" />
        <GroupedListItem
          title="Agents"
          value="2"
          disabled
          onPress={onPress}
          href="/settings/agents"
        />
        <GroupedListItem
          title="Connection"
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

// A status the value already says is named once; the description joins the name.
export const DescriptionAndStatus: Story = {
  render: (): React.JSX.Element => (
    <GroupedList>
      <GroupedListSection>
        <GroupedListItem
          title="Codex"
          subtitle={{ text: 'Coding assistant' }}
          value="Update available"
          status={{ tone: 'warning', label: 'Update available' }}
          onPress={onPress}
        />
        <GroupedListItem
          title="goose"
          value="Not installed"
          onPress={onPress}
        />
      </GroupedListSection>
    </GroupedList>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', {
        name: 'Codex, Coding assistant, Update available',
      }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('link', { name: 'goose, Not installed' }),
    ).toBeVisible();
  },
};

export const SidebarSelection: Story = {
  render: (): React.JSX.Element => (
    <GroupedList variant="sidebar">
      <GroupedListSection>
        <GroupedListItem
          title="Projects"
          value="1"
          onPress={onPress}
          href="/settings/projects"
        />
        <GroupedListItem
          title="Connection"
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
