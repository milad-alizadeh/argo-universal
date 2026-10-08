import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useId, useState } from 'react';
import { View } from 'react-native';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';

function RadioGroupExample({
  initialValue = 'comfortable',
  disabled = false,
}: {
  initialValue?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const id = useId();
  return (
    <RadioGroup value={value} onValueChange={setValue} disabled={disabled}>
      {['default', 'comfortable', 'compact'].map((option) => (
        <View key={option} className="flex-row items-center gap-3">
          <RadioGroupItem value={option} aria-labelledby={`${id}-${option}`} />
          <Label
            nativeID={`${id}-${option}`}
            onPress={() => !disabled && setValue(option)}
          >
            {option}
          </Label>
        </View>
      ))}
    </RadioGroup>
  );
}

const meta = {
  title: 'Design System/Primitives/Radio Group',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Radio Group',
  render: () => (
    <Variations>
      <Variation label="Enabled">
        <RadioGroupExample />
      </Variation>
      <Variation label="Disabled">
        <RadioGroupExample disabled />
      </Variation>
    </Variations>
  ),
};
