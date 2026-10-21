import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '#primitives/content/text';
import { Link } from './index';
import {
  inlineLink,
  routeLink,
  standaloneLink,
  unsupportedLink,
} from './link-fixtures';

const meta = {
  title: 'Design System/Primitives/Content/Link',
  component: Link,
  argTypes: kitArgTypes('Link'),
  // A link draws in running text, as it sits in a product layout.
  decorators: [
    (Story): React.JSX.Element => (
      <Text>
        <Story />
      </Text>
    ),
  ],
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  args: inlineLink,
  render: (args): React.JSX.Element => (
    <>
      Inline text with <Link {...args} />.
    </>
  ),
};

export const Standalone: Story = {
  args: standaloneLink,
  decorators: [
    (Story): React.JSX.Element => (
      <Text role="secondary" tone="muted">
        <Story />
      </Text>
    ),
  ],
};

export const Route: Story = {
  args: routeLink,
};

export const Unsupported: Story = {
  args: unsupportedLink,
};
