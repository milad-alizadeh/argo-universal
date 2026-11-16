import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List } from '#primitives/lists/list';
import { FieldGroup } from './field-group';
import { EditableProperties } from './field-group-properties-editable.mocks';
import {
  groupedPathFields,
  longPathFields,
  readOnlyFields,
} from './field-group-properties-fixtures';

const meta = {
  title: 'Design System/Primitives/Forms/FieldGroup/Properties',
  component: FieldGroup,
  argTypes: kitArgTypes('FieldGroup'),
  // The rows sit in a detail column, whose width is what makes a value wrap or truncate.
  decorators: [
    (Story): React.JSX.Element => (
      <View style={{ width: Platform.OS === 'web' ? 280 : 360 }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof FieldGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReadOnlyFields: Story = { args: readOnlyFields };

export const LongPath: Story = {
  args: longPathFields,
};

// Inside a grouped List, such as a Settings page, the rows are rows of the section's card.
export const InAGroupedList: Story = {
  render: () => (
    <List appearance="plain" maxHeight={400}>
      <FieldGroup {...groupedPathFields} />
    </List>
  ),
};

// A Picker whose value opens the choices: a single choice, and tags that are searched and created.
export const EditableFields: Story = {
  render: () => <EditableProperties />,
};
