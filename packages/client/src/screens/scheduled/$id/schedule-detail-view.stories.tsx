import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { firstSchedule } from '../scheduled-fixtures';
import { ScheduleDetailView } from './schedule-detail-view';
import { longInstructions } from './schedule-detail-view-fixtures';

const meta = {
  title: 'Screens/Scheduled/Schedule',
  component: ScheduleDetailView,
  args: { schedule: firstSchedule, onRunNow: fn() },
  parameters: { screenPreview: true },
  argTypes: { error: { control: 'text' } },
} satisfies Meta<typeof ScheduleDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BeforeFirstRun: Story = {};

export const LongInstructions: Story = {
  args: longInstructions,
};

export const Missing: Story = { args: { schedule: undefined } };

export const Loading: Story = {
  args: { schedule: undefined, status: 'loading' },
};

export const LoadFailed: Story = {
  args: { schedule: undefined, status: 'failed' },
};
