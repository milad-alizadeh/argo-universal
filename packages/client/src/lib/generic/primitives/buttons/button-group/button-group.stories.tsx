import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Button } from '#primitives/buttons/button';
import { Variation, Variations as VariationList } from '../../../variations';
import { ButtonGroup } from './button-group';

const meta = {
  title: 'Design System/Primitives/ButtonGroup',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'ButtonGroup',
  render: () => (
    <VariationList>
      <SecondaryButtonsExample />
    </VariationList>
  ),
};

function SecondaryButtonsExample(): React.JSX.Element {
  return (
    <Variation label="Secondary">
      <View className="flex-row">
        <ButtonGroup>
          {secondaryButtons(['Previous', 'Today', 'Next'])}
        </ButtonGroup>
      </View>
    </Variation>
  );
}

// ButtonGroup joins the corners of its direct children, so these stay Buttons, not a wrapper.
function secondaryButtons(labels: string[]): React.JSX.Element[] {
  return labels.map((label) => (
    <Button key={label} variant="secondary" label={label} />
  ));
}
