import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListSwitchItem } from './grouped-list-switch-item';

const meta = {
  title: 'Design System/Primitives/GroupedListSwitchItem',
  component: GroupedListSwitchItem,
  parameters: { screenPreview: true },
  args: {
    label: 'Show closed pull requests',
    value: false,
    onValueChange: () => {},
  },
} satisfies Meta<typeof GroupedListSwitchItem>;

export default meta;

type Story = StoryObj<typeof meta>;

function LiveRow({
  label,
  icon,
  initial,
}: {
  label: string;
  icon?: 'plug';
  initial: boolean;
}): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return (
    <GroupedListSwitchItem
      label={label}
      icon={icon}
      value={value}
      onValueChange={setValue}
    />
  );
}

export const Variations: Story = {
  render: () => (
    <GroupedList>
      <GroupedListSection title="On and off" footer="Each row is one switch.">
        <LiveRow label="On" initial />
        <LiveRow label="Off" initial={false} />
        <LiveRow label="With an icon" icon="plug" initial />
      </GroupedListSection>
      <GroupedListSection title="Disabled">
        <GroupedListSwitchItem
          label="Disabled on"
          value
          disabled
          onValueChange={() => {}}
        />
        <GroupedListSwitchItem
          label="Disabled off"
          value={false}
          disabled
          onValueChange={() => {}}
        />
      </GroupedListSection>
    </GroupedList>
  ),
};
