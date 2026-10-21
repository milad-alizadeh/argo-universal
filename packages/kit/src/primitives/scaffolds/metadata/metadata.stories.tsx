import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List } from '#primitives/lists/list';
import { Metadata } from './metadata';
import {
  groupedPathMetadata,
  longPathMetadata,
  readOnlyFieldsMetadata,
} from './metadata-fixtures';

const meta = {
  title: 'Design System/Primitives/Scaffolds/Metadata',
  component: Metadata,
  argTypes: kitArgTypes('Metadata'),
  // The fields sit in a detail column, whose width is what makes a value wrap or truncate.
  decorators: [
    (Story): React.JSX.Element => (
      <View style={{ width: Platform.OS === 'web' ? 280 : 360 }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof Metadata>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReadOnlyFields: Story = { args: readOnlyFieldsMetadata };

export const LongPath: Story = {
  args: longPathMetadata,
};

// Inside a grouped List, such as a Settings page, the fields are rows of the section's card.
export const InAGroupedList: Story = {
  render: () => (
    <List appearance="grouped" maxHeight={400}>
      <Metadata {...groupedPathMetadata} />
    </List>
  ),
};
