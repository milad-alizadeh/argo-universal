import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldSlider } from './field-slider';

// A row's stories draw it as the one row of a FieldGroup section, where Expo UI draws it.
const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Design System/Primitives/Fields/FieldSlider',
  component: FieldSlider,
  args: {
    title: 'Label',
    value: 50,
    min: 0,
    max: 100,
    step: 10,
    onValueChange: fn(),
  },
  argTypes: kitArgTypes('FieldGroup.Slider'),
  parameters: { screenPreview: true },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldSlider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Half: Story = {};
