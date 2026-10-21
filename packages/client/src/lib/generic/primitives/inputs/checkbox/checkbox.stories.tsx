import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { createElement, useState } from 'react';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { Checkbox, type CheckboxProps } from './checkbox';

function Example(
  props: Omit<CheckboxProps, 'onValueChange' | 'label'>,
): React.JSX.Element {
  const [value, setValue] = useState(props.value);

  return createElement(Checkbox, {
    ...props,
    value,
    onValueChange: setValue,
    label: 'Notify team',
  });
}

const meta = {
  title: 'Design System/Primitives/Inputs/Checkbox',
  component: Checkbox,
  argTypes: kitArgTypes('Checkbox'),
} satisfies Meta;

export default meta;

type Story = StoryObj;

function unchecked(): React.JSX.Element {
  return (
    <Variation label="Unchecked">
      <Example value={false} />
    </Variation>
  );
}

function checked(): React.JSX.Element {
  return (
    <Variation label="Checked">
      <Example value />
    </Variation>
  );
}

function disabled(): React.JSX.Element {
  return (
    <Variation label="Disabled">
      <Example value disabled />
    </Variation>
  );
}

function invalid(): React.JSX.Element {
  return (
    <Variation label="Invalid">
      <Example value={false} errors={['Confirm your choice']} />
    </Variation>
  );
}

export const Variations: Story = {
  name: 'Checkbox',
  render: () =>
    createElement(
      VariationList,
      null,
      unchecked(),
      checked(),
      disabled(),
      invalid(),
    ),
};
