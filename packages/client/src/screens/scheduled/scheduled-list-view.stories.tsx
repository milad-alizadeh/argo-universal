import { ListDetail } from '@repo/kit/primitives/scaffolds/list-detail';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { SessionDetailView } from '../sessions/$id/session-detail-view';
import { idleSession } from '../sessions/$id/session-detail-view.mocks';
import { SessionPageHeader } from '../sessions/$id/session-page-header';
import { latestSchedule, scheduledListFixture } from './scheduled-fixtures';
import { ScheduledListView } from './scheduled-list-view';

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
  render: (args) => (
    <ListDetail
      list={<ScheduledListView {...args} />}
      detail={
        <SessionDetailView
          state="open"
          {...idleSession}
          drawHeader={(page) => <SessionPageHeader {...page} />}
        />
      }
    />
  ),
};
