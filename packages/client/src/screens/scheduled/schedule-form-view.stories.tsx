import { Dialog } from '@repo/kit/primitives/overlays/dialog';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { fn } from 'storybook/test';
import { ScheduleFormView } from './schedule-form-view';
import {
  latestSchedule,
  scheduleFormFixture,
  scheduledListFixture,
} from './scheduled-fixtures';
import { ScheduledListView } from './scheduled-list-view';
import { SchedulePreviewFrame } from './scheduled-preview.mocks';

const meta = {
  title: 'Screens/Scheduled/New Schedule',
  component: ScheduleFormView,
  args: { ...scheduleFormFixture, onSubmit: fn() },
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
