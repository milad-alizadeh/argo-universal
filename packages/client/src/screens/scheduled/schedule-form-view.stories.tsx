import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { ScheduleFormView } from './schedule-form-view';
import { scheduleFormFixture } from './scheduled-fixtures';

const meta = {
  title: 'Screens/Scheduled/New Schedule',
  component: ScheduleFormView,
  args: { ...scheduleFormFixture, onSubmit: fn() },
  parameters: { screenPreview: true },
  argTypes: { saving: { control: 'boolean' }, error: { control: 'text' } },
} satisfies Meta<typeof ScheduleFormView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Setup: Story = {};

export const Advanced: Story = { args: { initiallyAdvanced: true } };
