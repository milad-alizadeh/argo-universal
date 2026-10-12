import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { Variation, Variations as VariationList } from '../variations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { MenuButton } from './menu-button';
import { Text } from './text';

const ranges = ['Today', 'This week', 'This month'];

function RangeMenu(): React.JSX.Element {
  const [shown, setShown] = useState(ranges[0]);
  return (
    <View className="flex-row items-center gap-1.5">
      <Text role="secondary">{shown}</Text>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MenuButton label={`+${ranges.length - 1} more`} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {ranges.map((range) => (
            <DropdownMenuItem
              key={range}
              accessibilityState={{ selected: range === shown }}
              onPress={() => setShown(range)}
            >
              <Text>{range}</Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  );
}

const meta = { title: 'Design System/Primitives/MenuButton' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'MenuButton',
  render: () => (
    <VariationList>
      <Variation label="Inline with secondary text">
        <RangeMenu />
      </Variation>
    </VariationList>
  ),
};
