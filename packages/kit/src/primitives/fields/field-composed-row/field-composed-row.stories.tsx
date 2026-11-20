import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldComposedRow } from './field-composed-row';
import { livingRoom } from './field-composed-row-fixtures';
import { LightRow } from './field-composed-row.mocks';

const meta = {
  title: 'Design System/Primitives/Forms/FieldComposedRow',
  component: FieldComposedRow,
  argTypes: kitArgTypes('FieldGroup.Row'),
  parameters: { screenPreview: true },
} satisfies Meta<typeof FieldComposedRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Lights: Story = {
  render: (): React.JSX.Element => (
    <FieldGroup>
      <FieldGroup.Section title="Living room">
        {livingRoom.map((light) => (
          <LightRow key={light.id} light={light} />
        ))}
      </FieldGroup.Section>
    </FieldGroup>
  ),
};
