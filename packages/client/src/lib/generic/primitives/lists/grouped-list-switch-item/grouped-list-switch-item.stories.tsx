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
    onValueChange: (): void => {},
  },
} satisfies Meta<typeof GroupedListSwitchItem>;

export default meta;

type Story = StoryObj<typeof meta>;

type LiveRowProps = { label: string; icon?: 'plug'; initial: boolean };

function LiveRow({ label, icon, initial }: LiveRowProps): React.JSX.Element {
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

const ignore = (): void => {};

function DisabledRows(): React.JSX.Element {
  return (
    <GroupedListSection title="Disabled">
      {[true, false].map((value) => (
        <GroupedListSwitchItem
          key={String(value)}
          label={value ? 'Disabled on' : 'Disabled off'}
          value={value}
          disabled
          onValueChange={ignore}
        />
      ))}
    </GroupedListSection>
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
      <DisabledRows />
    </GroupedList>
  ),
};
