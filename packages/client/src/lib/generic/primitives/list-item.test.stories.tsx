import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { FieldGroup } from './field-group';
import { FieldSection } from './field-section';
import { ListItem } from './list-item';

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
