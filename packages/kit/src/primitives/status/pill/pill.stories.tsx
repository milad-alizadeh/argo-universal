import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Pill } from './pill';

const meta = {
  title: 'Design System/Primitives/Status/Pill',
  component: Pill,
  args: { text: 'Ready' },
  argTypes: kitArgTypes('Pill'),
} satisfies Meta<typeof Pill>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { tone: 'neutral' } };

export const Muted: Story = { args: { tone: 'muted' } };

export const Accent: Story = { args: { tone: 'accent' } };

export const Info: Story = { args: { tone: 'info' } };

export const Success: Story = { args: { tone: 'success' } };

export const Warning: Story = { args: { tone: 'warning' } };

export const Danger: Story = { args: { tone: 'danger' } };

export const Done: Story = { args: { tone: 'done' } };
