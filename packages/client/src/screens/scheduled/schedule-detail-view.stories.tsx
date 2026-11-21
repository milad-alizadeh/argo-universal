import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { ScheduleDetailView } from './schedule-detail-view';
import { firstSchedule } from './scheduled-fixtures';

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
