import { useStackPush, withStack } from '@repo/kit/story-stack';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { fn } from 'storybook/test';
import { latestSchedule, scheduledListFixture } from './scheduled-fixtures';
import { ScheduledListView } from './scheduled-list-view';
import {
  LatestScheduledRun,
  SchedulePreviewFrame,
} from './scheduled-preview.mocks';

const meta = {
  title: 'Screens/Scheduled/Scheduled',
  component: ScheduledListView,
  args: { ...scheduledListFixture, onCreate: fn(), onOpen: fn() },
  parameters: { screenPreview: true },
  argTypes: { selectedId: { control: 'text' } },
} satisfies Meta<typeof ScheduledListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Schedules: Story = {};

export const Empty: Story = { args: { schedules: [] } };

export const SelectedSession: Story = {
  args: { selectedId: latestSchedule.id },
  render: (args): ReactElement => (
    <SchedulePreviewFrame list={<ScheduledListView {...args} />} />
  ),
};

function PhoneScheduleList(
  args: React.ComponentProps<typeof ScheduledListView>,
): ReactElement {
  const push = useStackPush();

  return <ScheduledListView {...args} onOpen={() => push('latest')} />;
}

export const PhoneSession: Story = {
  decorators: [withStack({ latest: LatestScheduledRun })],
  render: (args): ReactElement => <PhoneScheduleList {...args} />,
};
