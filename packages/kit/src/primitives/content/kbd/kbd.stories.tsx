import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Kbd } from './kbd';
import { chordKbd, singleKeyKbd } from './kbd-fixtures';

const meta = {
  title: 'Design System/Primitives/Content/Kbd',
  component: Kbd,
  argTypes: kitArgTypes('Kbd'),
} satisfies Meta<typeof Kbd>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SingleKey: Story = { args: singleKeyKbd };

export const Chord: Story = { args: chordKbd };
