import { Dialog } from '@repo/kit/primitives/overlays/dialog';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { fn } from 'storybook/test';
import { ScheduleDeleteView } from './schedule-delete-view';
import { latestSchedule, scheduledListFixture } from './scheduled-fixtures';
import { ScheduledListView } from './scheduled-list-view';
import { SchedulePreviewFrame } from './scheduled-preview.mocks';

const meta = {
  title: 'Screens/Scheduled/Delete Schedule',
  component: ScheduleDeleteView,
  args: { schedule: latestSchedule, saving: false, onDelete: fn() },
  argTypes: { saving: { control: 'boolean' } },
  parameters: { screenPreview: true },
  render: (args): ReactElement => (
    <>
      <SchedulePreviewFrame
        list={
          <ScheduledListView
            {...scheduledListFixture}
            selectedId={latestSchedule.id}
            onCreate={fn()}
            onOpen={fn()}
          />
        }
      />
      <Dialog open>
        <ScheduleDeleteView {...args} />
      </Dialog>
    </>
  ),
} satisfies Meta<typeof ScheduleDeleteView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Confirm: Story = {};
