import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Badge } from '#primitives/display/badge';
import { Text } from '#primitives/display/text';
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
  { title: 'Issues', icon: 'issue' },
  { title: 'Settings', icon: 'settings' },
];

const attention = {
  label: '2 need attention',
  element: (
    <Badge tone="danger">
      <Text>2</Text>
    </Badge>
  ),
};

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

function Destination(props: DestinationProps): React.JSX.Element {
  const { title, current, onSelect } = props;

  return (
    <DrawerItem
      label={title}
      icon={props.icon}
      selected={current === title}
      badge={title === 'Issues' ? attention : undefined}
      onPress={() => onSelect(title)}
    />
  );
}
