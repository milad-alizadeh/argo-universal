import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
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
        <ToggleIcon name="bold" />
      </Toggle>
    </View>
  );
}

const meta = {
  title: 'Design System/Primitives/Toggle',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Toggle',
  render: () => (
    <Variations>
      <Variation label="Off">
        <ToggleExample />
      </Variation>
      <Variation label="Pressed">
        <ToggleExample initialPressed />
      </Variation>
      <Variation label="Outline">
        <ToggleExample variant="outline" />
      </Variation>
      <Variation label="Small">
        <ToggleExample size="sm" />
      </Variation>
      <Variation label="Large">
        <ToggleExample size="lg" />
      </Variation>
      <Variation label="Disabled">
        <ToggleExample disabled />
      </Variation>
    </Variations>
  ),
};
