import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useId, useState } from 'react';
import { View } from 'react-native';
import {
  StorySections,
  Variation,
  Variations,
} from '../../mocks/primitive-story-variations';
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
function ValueExamples() {
  return (
    <Variations>
      {['default', 'comfortable', 'compact'].map((value) => (
        <Variation key={value} label={value}>
          <RadioGroupExample initialValue={value} />
        </Variation>
      ))}
    </Variations>
  );
}
function DisabledExamples() {
  return (
    <Variations>
      {[false, true].map((disabled) => (
        <Variation key={String(disabled)} label={String(disabled)}>
          <RadioGroupExample disabled={disabled} />
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Primitives/Radio Group',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StorySections
      sections={{ Value: ValueExamples, Disabled: DisabledExamples }}
    />
  ),
};
export const Value: Story = { render: ValueExamples };
export const Disabled: Story = { render: DisabledExamples };
