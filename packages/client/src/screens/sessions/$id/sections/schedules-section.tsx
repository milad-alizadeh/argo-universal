import { Text } from '@repo/kit/primitives/content/text';
import { ScheduleList, SchedulePreview } from '#features/sessions';
import type { SessionSection } from './session-section';

export const schedulesSection: SessionSection = {
  key: 'schedules',
  title: 'Schedules',
  icon: 'checklist',
  offered: (items) => Boolean(items.scheduleCount),
  count: (content) => content.schedules?.items.length ?? 0,
  card: ({ schedules }, tab) => ({
    onOpen: tab.open,
    trailing: (
      <Text role="secondary" tone="muted">
        {schedules?.items.length}
      </Text>
    ),
    summary: <SchedulePreview schedules={schedules} />,
  }),
  tab: ({ schedules }) => ({
    body: <ScheduleList schedules={schedules} />,
    count: schedules?.items.length,
  }),
  phone: ({ schedules }) => ({
    sheetHeader: <Text>Schedules</Text>,
    body: <ScheduleList schedules={schedules} />,
  }),
};
