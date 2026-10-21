import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text } from '#primitives/content/text';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { Stack } from './stack';

const meta = {
  title: 'Design System/Primitives/Layout/Stack',
  component: Stack,
  argTypes: kitArgTypes('Stack'),
  args: { direction: 'row' },
} satisfies Meta<typeof Stack>;

export default meta;

type Story = StoryObj<typeof meta>;

function Pair(): React.JSX.Element {
  return (
    <>
      <Text>One</Text>
      <Text>Two</Text>
    </>
  );
}

export const Variations: Story = {
  name: 'Stack',
  render: () => (
    <VariationList>
      <Variation label="Row">
        <Stack direction="row" gap={4}>
          <Pair />
        </Stack>
      </Variation>
      <Variation label="Column">
        <Stack direction="column" gap={2} align="start">
          <Pair />
        </Stack>
      </Variation>
    </VariationList>
  ),
};
