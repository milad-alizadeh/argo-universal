import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Collapsible } from './collapsible';
import { closedCollapsible, openCollapsible } from './collapsible-fixtures';

const meta = {
  title: 'Design System/Primitives/Layout/Collapsible',
  component: Collapsible,
  argTypes: kitArgTypes('Collapsible'),
  tags: ['third-party'],
} satisfies Meta<typeof Collapsible>;

export default meta;

type Story = StoryObj<typeof meta>;

// Hover is live: point at the header on a desktop viewport. Phones have no hover.
export const Closed: Story = { args: closedCollapsible };

export const Open: Story = { args: openCollapsible };
