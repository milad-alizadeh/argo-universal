import { Text } from '@repo/kit/primitives/content/text';
import {
  FollowUpEditor,
  ScheduleList,
  SchedulePreview,
  WorkbenchTextAction,
} from '#features/sessions';
import type { SessionSection } from './session-section';

const title = 'Scheduled';

export const schedulesSection: SessionSection = {
  key: 'schedules',
  title,
  icon: 'clock',
  offered: ({ followUpsAvailable }) => followUpsAvailable === true,
  count: ({ schedules }) => schedules?.items.length ?? 0,
  card: ({ schedules }, tab) => ({
    onOpen: schedules?.items.length ? tab.open : undefined,
    footer: schedules?.canCreate ? (
      <WorkbenchTextAction>
        <FollowUpEditor controls={schedules} />
      </WorkbenchTextAction>
    ) : null,
    summary: <SchedulePreview schedules={schedules} />,
  }),
  tab: ({ schedules }) => ({
    body: <ScheduleList schedules={schedules} />,
    count: schedules?.items.length,
  }),
  phone: ({ schedules }) => ({
    sheetHeader: <Text>{title}</Text>,
    body: <ScheduleList schedules={schedules} />,
  }),
};
