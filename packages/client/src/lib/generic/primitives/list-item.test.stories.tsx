import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';
import { FieldGroup } from './field-group';
import { FieldSection } from './field-section';
import { ListItem } from './list-item';
import { SelectMenu } from './select-menu';

const efforts = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;
type Effort = (typeof efforts)[number]['value'];

const onPress = fn<() => void>();
const onEffortChange = fn<(effort: Effort) => void>();

function EffortRow(): React.JSX.Element {
  const [effort, setEffort] = useState<Effort>('medium');
  return (
    <FieldGroup>
      <FieldSection title="Preferences">
        <ListItem
          title="Effort"
          accessory={
            <SelectMenu
              accessibilityLabel="Effort"
              value={effort}
              options={efforts}
              onValueChange={(next) => {
                setEffort(next);
                onEffortChange(next);
              }}
            />
          }
        />
      </FieldSection>
    </FieldGroup>
  );
}

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
    onEffortChange.mockClear();
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

export const AccessoryIsReachable: Story = {
  render: () => <EffortRow />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const row = canvas.getByRole('group', { name: 'Effort' });
    const trigger = within(row).getByRole('button', { name: 'Effort' });
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await page.findByRole('option', { name: 'High' }));
    await expect(onEffortChange).toHaveBeenCalledTimes(1);
    await expect(onEffortChange).toHaveBeenCalledWith('high');
  },
};
