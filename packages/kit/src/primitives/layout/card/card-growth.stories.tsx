import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Card } from './card';
import { GrowingCards } from './card-growth.mocks';

const meta = {
  title: 'Design System/Primitives/Layout/Card/Growth',
  parameters: { screenPreview: true },
  component: Card,
  argTypes: kitArgTypes('Card'),
  args: { title: 'First' },
  render: (): ReactElement => <GrowingCards />,
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

// Open the first card, then load content; its neighbour follows the changing height.
export const ArrivingContent: Story = {};
