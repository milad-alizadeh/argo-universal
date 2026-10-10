import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations } from '../variations';
import { Button } from './button';
import type { ButtonProps } from './button-props';

const saveLabel = 'Save changes';
const buttons: { state: string; props: ButtonProps }[] = [
  { state: 'Default', props: { label: saveLabel } },
  {
    state: 'Secondary',
    props: { label: saveLabel, variant: 'secondary' },
  },
  { state: 'Outlined', props: { label: saveLabel, variant: 'outline' } },
  { state: 'Text', props: { label: saveLabel, variant: 'ghost' } },
  { state: 'Link', props: { label: 'Learn more', variant: 'link' } },
  {
    state: 'Destructive',
    props: { label: 'Remove Agent', role: 'destructive', fullWidth: true },
  },
  { state: 'Small', props: { label: saveLabel, size: 'sm' } },
  { state: 'Large', props: { label: saveLabel, size: 'lg' } },
  { state: 'Disabled', props: { label: saveLabel, disabled: true } },
  { state: 'Loading', props: { label: saveLabel, loading: true } },
  { state: 'Leading icon', props: { label: 'Add Agent', icon: 'agent' } },
  {
    state: 'Argo content',
    props: { label: 'Continue', appearance: 'content', icon: 'arrow-right' },
  },
];

const meta = { title: 'Design System/Primitives/Button' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Button',
  render: () => (
    <Variations>
      {buttons.map(({ state, props }) => (
        <Variation key={state} label={state}>
          <View className="flex-row">
            <Button {...props} />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};
