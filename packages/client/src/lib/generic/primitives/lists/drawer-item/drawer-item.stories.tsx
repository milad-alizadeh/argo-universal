import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import type { IconName } from '../../../symbols/icon-names';
import { DrawerItem } from './drawer-item';

const meta = {
  title: 'Design System/Primitives/DrawerItem',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'DrawerItem',
  render: () => <Drawer />,
};

const destinations: { title: string; icon: IconName }[] = [
  { title: 'Sessions', icon: 'sessions' },
  { title: 'Issues', icon: 'triage' },
  { title: 'Atlas', icon: 'atlas' },
  { title: 'Settings', icon: 'settings' },
];

// A drawer's destinations: pressing one makes it the current one; Issues carries a count.
function Drawer(): React.JSX.Element {
  const [current, setCurrent] = useState('Sessions');

  return (
    <View className="w-72 gap-1">
      {destinations.map((destination) => (
        <Destination
          key={destination.title}
          {...destination}
          current={current}
          onSelect={setCurrent}
        />
      ))}
    </View>
  );
}

type DestinationProps = (typeof destinations)[number] & {
  current: string;
  onSelect: (title: string) => void;
};

// Only Issues has something waiting.
const issuesBadge = (title: string): { badge?: number; badgeLabel?: string } =>
  title === 'Issues' ? { badge: 3, badgeLabel: '3 need attention' } : {};

function Destination(props: DestinationProps): React.JSX.Element {
  const { title, current, onSelect } = props;

  return (
    <DrawerItem
      label={title}
      icon={props.icon}
      selected={current === title}
      {...issuesBadge(title)}
      onPress={() => onSelect(title)}
    />
  );
}
