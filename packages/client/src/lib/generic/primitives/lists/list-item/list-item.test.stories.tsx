import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group/field-group-view';
import { FieldSection } from '#primitives/fields/field-section/field-section-view';
import { ListItem } from './list-item-view';

const onPress = fn<() => void>();

const meta = {
  title: 'Tests/ListItem',
  component: ListItem,
  args: {
    title: 'Projects',
    value: '1',
    needsAttention: true,
    onPress,
    href: '/settings/projects',
  },
  render: (args): React.JSX.Element => (
    <FieldGroup>
      <FieldSection title="Server">
        <ListItem {...args} />
        <ListItem title="Version" value="1.0" />
        <ListItem
          title="Agents"
          value="2"
          disabled
          onPress={onPress}
          href="/settings/agents"
        />
        <ListItem
          title="Connection"
          value="Direct"
          onPress={onPress}
          href="/settings/connection"
        />
      </FieldSection>
    </FieldGroup>
  ),
  beforeEach: (): void => {
    onPress.mockClear();
  },
} satisfies Meta<typeof ListItem>;

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
    <FieldGroup>
      <FieldSection>
        <ListItem
          title="Codex"
          subtitle={{ text: 'Coding assistant' }}
          value="Update available"
          status={{ tone: 'warning', label: 'Update available' }}
          onPress={onPress}
        />
        <ListItem title="goose" value="Not installed" onPress={onPress} />
      </FieldSection>
    </FieldGroup>
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
    <FieldGroup variant="navigation">
      <FieldSection>
        <ListItem
          title="Projects"
          value="1"
          onPress={onPress}
          href="/settings/projects"
        />
        <ListItem
          title="Connection"
          value="This Mac"
          selected
          onPress={onPress}
          href="/settings/connection"
        />
      </FieldSection>
    </FieldGroup>
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
