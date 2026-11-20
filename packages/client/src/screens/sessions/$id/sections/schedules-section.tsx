import { Text } from '@repo/kit/primitives/content/text';
import { View } from 'react-native';
import type { ScheduleControls } from '#features/sessions';
import {
  scheduleTitle,
  scheduleInterval,
  ScheduleList,
} from '#features/sessions';
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
    summary: summary(schedules),
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

const summary = (
  schedules: ScheduleControls | undefined,
): React.JSX.Element => (
  <View>
    {schedules?.items.slice(0, 2).map((item) => (
      <View key={item.id}>
        <Text numberOfLines={1}>{scheduleTitle(item)}</Text>
        <Text role="secondary" tone="muted">
          {item.paused ? 'Paused' : scheduleInterval(item.intervalSeconds)}
        </Text>
      </View>
    ))}
  </View>
);
