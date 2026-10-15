import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import type { BadgeCount } from '../../../badge-count';
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

interface Destination {
  title: string;
  icon: IconName;
  badge?: BadgeCount;
}

// Sessions counts 2 that need attention; Issues has more than a badge shows, so it reads 99+.
const destinations: Destination[] = [
  {
    title: 'Sessions',
    icon: 'sessions',
    badge: { count: 2, label: '2 Sessions need attention' },
  },
  {
    title: 'Issues',
    icon: 'issue',
    badge: { count: 120, label: '120 open Issues' },
  },
  { title: 'Settings', icon: 'settings' },
];

// A drawer's destinations: pressing one makes it the current one; two carry a count.
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

type DestinationProps = Destination & {
  current: string;
  onSelect: (title: string) => void;
};

function Destination(props: DestinationProps): React.JSX.Element {
  const { title, current, onSelect } = props;

  return (
    <DrawerItem
      label={title}
      icon={props.icon}
      selected={current === title}
      badge={props.badge}
      onPress={() => onSelect(title)}
    />
  );
}
