import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CalloutLoading } from './launch-callout';
import {
  installing,
  loading,
  loadingConfiguration,
} from './launch-callout-fixtures';

const meta = {
  title: 'Sessions/CalloutLoading',
  component: CalloutLoading,
  argTypes: { title: { control: 'text' }, progress: { control: 'number' } },
  args: loading,
} satisfies Meta<typeof CalloutLoading>;

export default meta;

type Story = StoryObj<typeof meta>;

// No step to name: Retry and a sign-in's methods load under a busy Loading….
export const Loading: Story = { args: loading };

// Downloading the Agent, with how much of it has arrived.
export const Installing: Story = { args: installing };

/*
 * No story for a download without a total: the Callout draws the same page either way, and the
 * bar that sweeps instead of filling is ProgressBar's own Indeterminate story.
 */

// A step with no bar at all: the title alone.
export const LoadingConfiguration: Story = { args: loadingConfiguration };
