import { Dialog } from '@repo/kit/primitives/overlays/dialog';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { fn } from 'storybook/test';
import { ScheduleHistoryView } from './schedule-history-view';
import {
  latestSchedule,
  scheduleHistoryFixture,
  scheduledListFixture,
} from './scheduled-fixtures';
import { ScheduledListView } from './scheduled-list-view';
import { SchedulePreviewFrame } from './scheduled-preview.mocks';

const meta = {
  title: 'Screens/Scheduled/History',
  component: ScheduleHistoryView,
  args: { entries: scheduleHistoryFixture, onOpenSession: fn() },
  argTypes: { entries: { control: 'object' } },
  parameters: { screenPreview: true },
  render: (args): ReactElement => (
    <SchedulePreviewFrame
      list={
        <>
          <ScheduledListView
            {...scheduledListFixture}
            selectedId={latestSchedule.id}
            onCreate={fn()}
            onOpen={fn()}
          />
          <Dialog open onOpenChange={fn()}>
            <ScheduleHistoryView {...args} />
          </Dialog>
        </>
      }
    />
  ),
} satisfies Meta<typeof ScheduleHistoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Occurrences: Story = {};
