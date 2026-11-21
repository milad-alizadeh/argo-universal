import { Dialog } from '@repo/kit/primitives/overlays/dialog';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { fn } from 'storybook/test';
import { scheduleCadenceDraft } from './schedule-cadence-draft';
import { ScheduleFormPreview } from './schedule-form-preview.mocks';
import { ScheduleFormView } from './schedule-form-view';
import {
  customWeeksTiming,
  latestSchedule,
  scheduleFormFixture,
  scheduledListFixture,
  weekdaysTiming,
} from './scheduled-fixtures';
import { ScheduledListView } from './scheduled-list-view';
import { SchedulePreviewFrame } from './scheduled-preview.mocks';

const changeCadence = fn();

const meta = {
  title: 'Screens/Scheduled/New Schedule',
  component: ScheduleFormView,
  args: {
    ...scheduleFormFixture,
    timing: { ...weekdaysTiming, onChange: changeCadence },
    onSubmit: fn(),
  },
  render: (args): ReactElement => <ScheduleFormPreview {...args} />,
  parameters: { screenPreview: true },
  decorators: [
    (Story): ReactElement => (
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
          <Story />
        </Dialog>
      </>
    ),
  ],
  argTypes: { saving: { control: 'boolean' }, error: { control: 'text' } },
} satisfies Meta<typeof ScheduleFormView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Setup: Story = {};

export const Advanced: Story = { args: { initiallyAdvanced: true } };

export const CustomRepeat: Story = {
  args: { timing: { ...customWeeksTiming, onChange: changeCadence } },
};

export const Edit: Story = {
  args: {
    editing: latestSchedule,
    timing: {
      draft: scheduleCadenceDraft(latestSchedule.cadence),
      onChange: changeCadence,
    },
  },
};
