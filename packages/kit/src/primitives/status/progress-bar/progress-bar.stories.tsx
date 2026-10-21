import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { ProgressBar } from './progress-bar';

const meta = {
  title: 'Design System/Primitives/Status/ProgressBar',
  component: ProgressBar,
  args: { value: 0.4 },
  argTypes: kitArgTypes('ProgressBar'),
} satisfies Meta<typeof ProgressBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Running: Story = {
  args: { tone: 'success', active: true, accessibilityLabel: 'Plan' },
};

export const Waiting: Story = {
  args: {
    value: 0.75,
    tone: 'warning',
    active: true,
    accessibilityLabel: 'Jobs',
  },
};

export const NotStarted: Story = {
  args: { value: 0, tone: 'muted', accessibilityLabel: 'Queued' },
};

export const Complete: Story = {
  args: { value: 1, tone: 'done', accessibilityLabel: 'Complete' },
};

export const Failed: Story = {
  args: { tone: 'danger', accessibilityLabel: 'Failed' },
};

export const Neutral: Story = { args: { value: 0.5, tone: 'neutral' } };

export const Accent: Story = { args: { value: 0.5, tone: 'accent' } };

export const Info: Story = { args: { value: 0.5, tone: 'info' } };
