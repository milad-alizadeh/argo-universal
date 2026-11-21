import { Text } from '@repo/kit/primitives/content/text';
import {
  FollowUpEditor,
  ScheduleList,
  SchedulePreview,
} from '#features/sessions';
import type { SessionSection } from './session-section';

export const schedulesSection: SessionSection = {
  key: 'schedules',
  title: 'Follow-ups',
  icon: 'checklist',
  offered: ({ followUpsAvailable }) => followUpsAvailable === true,
  card: ({ schedules }, tab) => ({
    onOpen: schedules?.items.length ? tab.open : undefined,
    footer: schedules ? <FollowUpEditor controls={schedules} /> : null,
    summary: <SchedulePreview schedules={schedules} />,
  }),
  tab: ({ schedules }) => ({
    body: <ScheduleList schedules={schedules} />,
    count: schedules?.items.length,
  }),
  phone: ({ schedules }) => ({
    sheetHeader: <Text>Follow-ups</Text>,
    body: <ScheduleList schedules={schedules} />,
  }),
};
