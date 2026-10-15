import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { Platform, View } from 'react-native';
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

// As Paper draws each drawer: iOS counts one Session, Android three Issues under the inbox.
const ios = Platform.OS === 'ios';

const counted = ios ? 'Sessions' : 'Issues';

const count = ios ? 1 : 3;

const destinations: { title: string; icon: IconName }[] = [
  { title: 'Sessions', icon: 'sessions' },
  { title: 'Issues', icon: ios ? 'issue' : 'triage' },
  { title: 'Atlas', icon: 'atlas' },
  { title: 'Settings', icon: 'settings' },
];

// A drawer's destinations: pressing one makes it the current one; one carries a count.
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

// Only one destination has something waiting.
const destinationBadge = (
  title: string,
): { badge?: number; badgeLabel?: string } =>
  title === counted
    ? { badge: count, badgeLabel: `${count} need attention` }
    : {};

function Destination(props: DestinationProps): React.JSX.Element {
  const { title, current, onSelect } = props;

  return (
    <DrawerItem
      label={title}
      icon={props.icon}
      selected={current === title}
      {...destinationBadge(title)}
      onPress={() => onSelect(title)}
    />
  );
}
