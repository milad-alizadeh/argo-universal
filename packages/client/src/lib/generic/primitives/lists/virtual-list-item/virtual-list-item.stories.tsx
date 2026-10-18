import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { Variation, Variations } from '../../../variations';
import { VirtualListItem } from './virtual-list-item';
import type { VirtualListPosition } from './virtual-list-item-props';

const meta = {
  title: 'Design System/Primitives/Lists/VirtualListItem',
  component: VirtualListItem,
  args: { title: 'Build the Session layout', onPress: action('press row') },
} satisfies Meta<typeof VirtualListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

interface Row {
  title: string;
  detail: string;
  position: VirtualListPosition;
}

const section: readonly Row[] = [
  { title: 'Build the Session layout', detail: '3/8', position: 'first' },
  { title: 'Fix the Composer envelope', detail: '12m', position: 'middle' },
  {
    title: 'Rename Projects screen to Sessions',
    detail: '1h',
    position: 'last',
  },
];

const lone: readonly Row[] = [
  { title: 'Answer the review comments', detail: '2h', position: 'only' },
];

function ListRow(props: { row: Row; selected?: string }): React.JSX.Element {
  const { row } = props;

  return (
    <VirtualListItem
      title={row.title}
      leading={<Icon role="body" name="agent" />}
      trailing={<Text role="row-detail">{row.detail}</Text>}
      position={row.position}
      selected={row.title === props.selected}
      onPress={action(`press ${row.title}`)}
    />
  );
}

function Section(props: {
  rows: readonly Row[];
  selected?: string;
}): React.JSX.Element {
  return (
    <View className="w-full bg-content px-4 py-2 wide:w-frame-list wide:gap-0.5 wide:px-2">
      {props.rows.map((row) => (
        <ListRow key={row.title} row={row} selected={props.selected} />
      ))}
    </View>
  );
}

/*
 * A section's rows: one grouped card on iOS with inset separators, Material's tiles 2 apart on Android,
 * bare rows on a wide window. A lone row rounds every corner.
 */
export const Overview: Story = {
  name: 'VirtualListItem',
  render: () => (
    <Variations>
      <Variation label="Section">
        <Section rows={section} />
      </Variation>
      <Variation label="Section, first row selected (wide)">
        <Section rows={section} selected={section[0]?.title} />
      </Variation>
      <Variation label="Only row">
        <Section rows={lone} />
      </Variation>
    </Variations>
  ),
};
