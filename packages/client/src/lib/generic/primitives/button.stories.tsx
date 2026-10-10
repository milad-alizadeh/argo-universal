import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
import { Icon } from '../symbols/icon';
import { Button } from './button';
import { Text } from './text';

const buttons: { label: string; props: ComponentProps<typeof Button> }[] = [
  { label: 'Default', props: {} },
  { label: 'Destructive', props: { variant: 'destructive' } },
  { label: 'Outline', props: { variant: 'outline' } },
  { label: 'Secondary', props: { variant: 'secondary' } },
  { label: 'Ghost', props: { variant: 'ghost' } },
  { label: 'Link', props: { variant: 'link' } },
  { label: 'Small', props: { size: 'sm' } },
  { label: 'Large', props: { size: 'lg' } },
  { label: 'Disabled', props: { disabled: true } },
];

const meta = {
  title: 'Design System/Primitives/Button',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Button',
  render: () => (
    <Variations>
      {buttons.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <View className="flex-row">
            <Button {...props}>
              <Text>Button</Text>
            </Button>
          </View>
        </Variation>
      ))}
      <Variation label="Icon">
        <View className="flex-row">
          <Button size="icon" accessibilityLabel="Add">
            <Icon name="add" />
          </Button>
        </View>
      </Variation>
    </Variations>
  ),
};
