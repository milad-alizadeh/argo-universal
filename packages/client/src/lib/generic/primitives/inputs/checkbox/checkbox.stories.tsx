import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { createElement, useState } from 'react';
import { Variation, Variations as VariationList } from '../../../variations';
import { Checkbox, type CheckboxProps } from './checkbox';

function Example(
  props: Omit<CheckboxProps, 'onChange' | 'label'>,
): React.JSX.Element {
  const [value, setValue] = useState(props.value);
  return createElement(Checkbox, {
    ...props,
    value,
    onChange: setValue,
    label: 'Notify team',
  });
}

const meta = { title: 'Design System/Primitives/Checkbox' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

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
