import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { SearchField } from './search-field';
import { SearchFieldExample } from './search-field-example.mocks';

const meta = {
  title: 'Design System/Primitives/Inputs/SearchField',
  component: SearchField,
  args: { label: 'Search Agents', value: '', onChangeText: fn() },
  argTypes: kitArgTypes('SearchField'),
  /*
   * The query is typed into the field, so every state holds its own value; the example is the
   * header row the field sits in, with a title and one other action.
   */
  render: (args): React.JSX.Element => (
    <SearchFieldExample initial={args.value} />
  ),
} satisfies Meta<typeof SearchField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AtRest: Story = {};

export const Searching: Story = { args: { value: 'review' } };
