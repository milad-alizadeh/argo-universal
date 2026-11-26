import {
  NativeSidebarList,
  type SidebarRow,
  type SidebarSection,
} from '@repo/kit/native-sidebar';
import { useState, type ReactElement, type ReactNode } from 'react';
import {
  nativeSessionRow,
  sessionStatusDot,
  sessionStatusLabels,
} from '#features/sessions';
import { menuEntries, scheduleSubtitle } from './schedule-row-actions';
import type {
  NestedEntry,
  ScheduleEntry,
  ScheduledListViewProps,
} from './scheduled-list-view';

export function NativeScheduleRows({
  entries,
  props,
  empty,
}: {
  entries: readonly ScheduleEntry[];
  props: ScheduledListViewProps;
  empty: ReactNode;
}): ReactElement {
  const [pausedExpanded, setPausedExpanded] = useState(true);
  const sections: (SidebarSection & { rows: SidebarRow[] })[] = [];

  for (const entry of entries) {
    if (typeof entry === 'string') {
      sections.push({
        id: entry,
        title: entry,
        expanded: entry === 'Paused' ? pausedExpanded : undefined,
        onExpandedChange: entry === 'Paused' ? setPausedExpanded : undefined,
        rows: [],
      });
    } else {
      sections.at(-1)?.rows.push(nativeScheduleRow(entry, props));
    }
  }

  return (
    <NativeSidebarList
      sections={sections}
      empty={empty}
      onEndReached={props.onEndReached}
    />
  );
}

function nativeScheduleRow(
  entry: NestedEntry,
  props: ScheduledListViewProps,
): SidebarRow {
  const { session } = entry;

  if ('schedule' in session) {
    const { schedule, status } = session;

    return {
      id: schedule.id,
      title: schedule.name,
      status: status && {
        tone: sessionStatusDot(status).tone,
        label: sessionStatusLabels[status],
      },
      emphasized: status === 'unread',
      subtitle: scheduleSubtitle(schedule),
      selected: !props.selectedChildId && props.selectedId === schedule.id,
      onPress: () => props.onOpen(schedule),
      actions:
        props.onAction &&
        menuEntries({ schedule, onAction: props.onAction }).map((action) => ({
          title: action.label,
          icon: action.icon,
          disabled: action.disabled,
          destructive: action.tone === 'danger',
          onPress: action.onPress,
        })),
    };
  }

  return {
    ...nativeSessionRow(session, entry.tree?.depth),
    selected: session.sessionId === props.selectedChildId,
    onPress: () => {
      const schedule = props.schedules.find(
        ({ sessionId }) => sessionId === session.taskSessionId,
      );

      if (schedule) props.onOpenStarted?.(schedule, session.sessionId);
    },
  };
}
