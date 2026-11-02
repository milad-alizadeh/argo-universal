import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { StoppedTurnCallout } from './stopped-turn-callout';

const meta = {
  title: 'Sessions/StoppedTurnCallout',
  component: StoppedTurnCallout,
  argTypes: { onRetry: { control: false } },
  args: { reason: 'The Server restarted during this Turn', onRetry: fn() },
} satisfies Meta<typeof StoppedTurnCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// An error the Agent gave no words for.
export const TitleOnly: Story = { args: { reason: undefined } };
