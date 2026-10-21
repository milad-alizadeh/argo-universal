import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
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
    props: { label: 'Delete', tone: 'danger', fullWidth: true },
  },
  {
    state: 'Extra small (a phone draws Default)',
    props: { label: saveLabel, size: 'xs' },
  },
  {
    state: 'Small (a phone draws Default)',
    props: { label: saveLabel, size: 'sm' },
  },
  {
    state: 'Full width on a phone',
    props: {
      label: 'Add argument',
      variant: 'ghost',
      size: 'sm',
      icon: 'add',
      fullWidth: 'narrow',
    },
  },
  { state: 'Large', props: { label: saveLabel, size: 'lg' } },
  { state: 'Disabled', props: { label: saveLabel, disabled: true } },
  { state: 'Loading', props: { label: saveLabel, loading: true } },
  { state: 'Leading icon', props: { label: 'Add', icon: 'agent' } },
];

const meta = {
  title: 'Design System/Primitives/Actions/Button',
  component: Button,
  argTypes: kitArgTypes('Button'),
} satisfies Meta;

export default meta;

type Story = StoryObj;

function ButtonExamples(): React.JSX.Element {
  return (
    <VariationList>
      {buttons.map(({ state, props }) => (
        <ButtonExample key={state} state={state} props={props} />
      ))}
    </VariationList>
  );
}

interface ExampleOptions {
  state: string;
  props: React.ComponentProps<typeof Button>;
}

function ButtonExample(options: ExampleOptions): React.JSX.Element {
  return (
    <Variation label={options.state}>
      <View className="flex-row">
        <Button {...options.props} />
      </View>
    </Variation>
  );
}

export const Variations: Story = {
  name: 'Button',
  render: ButtonExamples,
};
