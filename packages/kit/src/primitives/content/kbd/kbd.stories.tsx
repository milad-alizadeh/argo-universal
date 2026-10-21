import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Kbd } from './kbd';

const meta = {
  title: 'Design System/Primitives/Content/Kbd',
  component: Kbd,
  args: { keys: ['↵'] },
  argTypes: kitArgTypes('Kbd'),
} satisfies Meta<typeof Kbd>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SingleKey: Story = {};

export const Chord: Story = { args: { keys: ['⇧', '⌘', 'C'] } };
