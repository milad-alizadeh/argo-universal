import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import type { BadgeCount } from '../../../badge-count';
import { Variation, Variations as VariationList } from '../../../variations';
import { CountBadge } from './count-badge';

const meta = {
  title: 'Design System/Primitives/Status/CountBadge',
  component: CountBadge,
} satisfies Meta<typeof CountBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

// The badge hugs its count, as it does at a row's end or on a rail tile.
function BadgeVariation(props: {
  label: string;
  badge: BadgeCount;
}): React.JSX.Element {
  return (
    <Variation label={props.label}>
      <View className="flex-row">
        <CountBadge badge={props.badge} />
      </View>
    </Variation>
  );
}

export const Variations: Story = {
  name: 'CountBadge',
  render: () => (
    <VariationList>
      <BadgeVariation
        label="Count"
        badge={{ count: 3, label: '3 Sessions need attention' }}
      />
      <BadgeVariation label="Over 99" badge={{ count: 120 }} />
    </VariationList>
  ),
};
