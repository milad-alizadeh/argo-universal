import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List } from '#primitives/lists/list';
import { ListItem } from './index';
import { assigned } from './list-item-assignees-fixtures';

const meta = {
  title: 'Design System/Primitives/Lists/ListItem/Assignees',
  component: ListItem,
  argTypes: kitArgTypes('ListItem'),
  parameters: { screenPreview: true },
  decorators: [
    (Story): JSX.Element => (
      <List appearance="plain">
        <Story />
      </List>
    ),
  ],
} satisfies Meta<typeof ListItem>;

export default meta;

export const Assigned: StoryObj<typeof meta> = { args: assigned };
