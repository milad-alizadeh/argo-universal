import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { ProgressBar } from './progress-bar';
import {
  accentProgressBar,
  completeProgressBar,
  failedProgressBar,
  infoProgressBar,
  neutralProgressBar,
  notStartedProgressBar,
  runningProgressBar,
  waitingProgressBar,
} from './progress-bar-fixtures';

const meta = {
  title: 'Design System/Primitives/Status/ProgressBar',
  component: ProgressBar,
  argTypes: kitArgTypes('ProgressBar'),
} satisfies Meta<typeof ProgressBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Running: Story = { args: runningProgressBar };

export const Waiting: Story = { args: waitingProgressBar };

export const NotStarted: Story = { args: notStartedProgressBar };

export const Complete: Story = { args: completeProgressBar };

export const Failed: Story = { args: failedProgressBar };

export const Neutral: Story = { args: neutralProgressBar };

export const Accent: Story = { args: accentProgressBar };

export const Info: Story = { args: infoProgressBar };
