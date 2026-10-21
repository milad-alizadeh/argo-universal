import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { Variation, Variations as VariationList } from '../../../variations';
import { Spacer } from './spacer';

const meta = {
  title: 'Design System/Primitives/Layout/Spacer',
  component: Spacer,
  argTypes: kitArgTypes('Spacer'),
} satisfies Meta<typeof Spacer>;

export default meta;

type Story = StoryObj<typeof meta>;

function Horizontal({
  centred = false,
}: {
  centred?: boolean;
}): React.JSX.Element {
  return (
    <Stack direction="row">
      <Text>Start</Text>
      <Spacer />
      <Middle centred={centred} />
      <Text>End</Text>
    </Stack>
  );
}

function Vertical(): React.JSX.Element {
  return (
    <View className="h-40">
      <View className="flex-1">
        <Text>Title</Text>
        <Spacer />
        <Text>Continue</Text>
      </View>
    </View>
  );
}

export const Variations: Story = {
  name: 'Spacer',
  render: () => (
    <VariationList>
      <Variation label="Flexible (horizontal)">
        <Horizontal />
      </Variation>
      <Variation label="Flexible (vertical)">
        <Vertical />
      </Variation>
      <Variation label="Two Spacers">
        <Horizontal centred />
      </Variation>
    </VariationList>
  ),
};

function Middle({ centred }: { centred: boolean }): React.ReactNode {
  return centred ? (
    <>
      <Text>Centre</Text>
      <Spacer />
    </>
  ) : null;
}
