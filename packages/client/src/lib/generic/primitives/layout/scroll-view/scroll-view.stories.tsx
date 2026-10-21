import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { Surface } from '#primitives/layout/surface';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { ScrollView } from './scroll-view';

const meta = {
  title: 'Design System/Primitives/Layout/ScrollView',
  component: ScrollView,
  argTypes: kitArgTypes('ScrollView'),
} satisfies Meta<typeof ScrollView>;

export default meta;

type Story = StoryObj<typeof meta>;

const rows = Array.from({ length: 12 }, (_, index) => `Item ${index + 1}`);

function Vertical(): React.JSX.Element {
  return (
    <View className="h-40">
      <ScrollView>
        <Stack direction="column" gap={3}>
          {rows.map((row) => (
            <Text key={row}>{row}</Text>
          ))}
        </Stack>
      </ScrollView>
    </View>
  );
}

function Horizontal(): React.JSX.Element {
  return (
    <ScrollView direction="horizontal">
      <Stack direction="row" gap={3}>
        {rows.map((row) => (
          <Surface key={row} kind="card" padding={4}>
            <Text>{row}</Text>
          </Surface>
        ))}
      </Stack>
    </ScrollView>
  );
}

export const Variations: Story = {
  name: 'ScrollView',
  render: () => (
    <VariationList>
      <Variation label="Vertical">
        <Vertical />
      </Variation>
      <Variation label="Horizontal">
        <Horizontal />
      </Variation>
      <Variation label="Content fits">
        <Fits />
      </Variation>
    </VariationList>
  ),
};

function Fits(): React.JSX.Element {
  return (
    <View className="h-20">
      <ScrollView>
        <Text>All up to date</Text>
      </ScrollView>
    </View>
  );
}
