import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { TextBIcon } from 'phosphor-react-native/src/icons/TextB';
import { useState } from 'react';
import { View } from 'react-native';
import {
  StorySections,
  Variation,
  Variations,
} from '../../mocks/primitive-story-variations';
import { Toggle, ToggleIcon } from './toggle';

function ToggleExample({
  variant = 'default',
  size = 'default',
  disabled = false,
  initialPressed = false,
}: {
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
  initialPressed?: boolean;
}) {
  const [pressed, setPressed] = useState(initialPressed);
  return (
    <View className="flex-row">
      <Toggle
        variant={variant}
        size={size}
        disabled={disabled}
        pressed={pressed}
        onPressedChange={setPressed}
        accessibilityLabel="Toggle bold"
      >
        <ToggleIcon as={TextBIcon} />
      </Toggle>
    </View>
  );
}
function VariantExamples() {
  return (
    <Variations>
      {(['default', 'outline'] as const).map((variant) => (
        <Variation key={variant} label={variant}>
          <ToggleExample variant={variant} />
        </Variation>
      ))}
    </Variations>
  );
}
function SizeExamples() {
  return (
    <Variations>
      {(['default', 'sm', 'lg'] as const).map((size) => (
        <Variation key={size} label={size}>
          <ToggleExample size={size} />
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
          <ToggleExample disabled={disabled} />
        </Variation>
      ))}
    </Variations>
  );
}
function PressedExamples() {
  return (
    <Variations>
      {[false, true].map((pressed) => (
        <Variation key={String(pressed)} label={String(pressed)}>
          <ToggleExample initialPressed={pressed} />
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Primitives/Toggle',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StorySections
      sections={{
        Variant: VariantExamples,
        Size: SizeExamples,
        Disabled: DisabledExamples,
        Pressed: PressedExamples,
      }}
    />
  ),
};
export const Variant: Story = { render: VariantExamples };
export const Size: Story = { render: SizeExamples };
export const Disabled: Story = { render: DisabledExamples };
export const Pressed: Story = { render: PressedExamples };
