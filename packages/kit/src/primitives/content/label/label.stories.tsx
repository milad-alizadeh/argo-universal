import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Label } from './label';

const subagents = '3 items';

const meta = {
  title: 'Design System/Primitives/Content/Label',
  component: Label,
  args: { text: subagents },
  argTypes: kitArgTypes('Label'),
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Count: Story = { args: { icon: 'agent' } };

export const Success: Story = {
  args: { icon: 'pr-open', text: '#45', tone: 'success' },
};

export const Info: Story = {
  args: { icon: 'check', text: '2/5', tone: 'info' },
};

export const Danger: Story = {
  args: { icon: 'warning', text: 'Failed', tone: 'danger' },
};

export const Merged: Story = {
  args: { icon: 'pr-merged', text: '#46', tone: 'done' },
};

export const Queued: Story = {
  args: { icon: 'cycle', text: 'Waiting', tone: 'warning' },
};

export const Neutral: Story = {
  args: { icon: 'check', text: 'Neutral', tone: 'neutral' },
};

export const Accent: Story = {
  args: { icon: 'check', text: 'Accent', tone: 'accent' },
};

export const TextOnly: Story = {
  args: { text: 'v1.2.0', testID: 'label-text-only' },
};
