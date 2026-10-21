import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { LaunchCallout } from './launch-callout';
import {
  failedLaunch,
  failedLaunchWithoutOutput,
} from './launch-callout-fixtures';

const meta = {
  title: 'Sessions/LaunchCallout',
  component: LaunchCallout,
  // LaunchCalloutProps is declared in types/session-callout.ts, which react-docgen cannot follow.
  argTypes: {
    message: {
      control: 'text',
      description:
        'How the Agent stopped, then the last stderr block; or the error text alone.',
    },
    onRetry: { control: false },
  },
  args: { ...failedLaunch, onRetry: fn() },
} satisfies Meta<typeof LaunchCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

// Zed's Failed to Launch callout: the first line describes it, the stderr block below it.
export const FailedToLaunch: Story = { args: failedLaunch };

// The error text alone, with no stderr block to show.
export const FailedWithoutOutput: Story = {
  args: failedLaunchWithoutOutput,
};
