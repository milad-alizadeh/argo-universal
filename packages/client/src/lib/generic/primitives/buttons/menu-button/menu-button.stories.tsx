import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { Variation, Variations as VariationList } from '../../../variations';
import { Text } from '../../display/text/text';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../overlays/dropdown-menu/dropdown-menu';
import { MenuButton } from './menu-button';

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
        <RangeOptions shown={shown} onSelect={setShown} />
      </DropdownMenu>
    </View>
  );
}

interface RangeOptionsProps {
  shown: string | undefined;
  onSelect: (range: string) => void;
}

function RangeOptions(props: RangeOptionsProps): React.JSX.Element {
  return (
    <DropdownMenuContent align="start">
      {ranges.map((range) => (
        <RangeItem
          key={range}
          range={range}
          selected={range === props.shown}
          onSelect={props.onSelect}
        />
      ))}
    </DropdownMenuContent>
  );
}

function RangeItem(props: {
  range: string;
  selected: boolean;
  onSelect: (range: string) => void;
}): React.JSX.Element {
  return (
    <DropdownMenuItem
      accessibilityState={{ selected: props.selected }}
      onPress={() => props.onSelect(props.range)}
    >
      <Text>{props.range}</Text>
    </DropdownMenuItem>
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
