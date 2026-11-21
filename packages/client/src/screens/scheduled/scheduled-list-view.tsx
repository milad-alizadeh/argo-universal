import type { ProjectSchedule } from '@repo/contracts/operations';
import { Action } from '@repo/kit/primitives/actions/action';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import { useSidebarGutterHeld } from '@repo/kit/sidebar-gutter';
import type { ReactElement } from 'react';
import { sessionsListLook } from '#features/sessions';
import { intervalLabel, upcomingOccurrence } from './schedule-time';

export interface ScheduledListViewProps {
  schedules: readonly ProjectSchedule[];
  selectedId?: string;
  status?: 'loading' | 'failed';
  onCreate: () => void;
  onOpen: (schedule: ProjectSchedule) => void;
}

export function ScheduledListView(props: ScheduledListViewProps): ReactElement {
  return (
    <Screen
      title="Scheduled"
      primaryAction={
        <Action
          label="New Schedule"
          icon="new-session"
          onPress={props.onCreate}
        />
      }
    >
      {props.schedules.length > 0 && <ScheduleRows {...props} />}
      {props.schedules.length === 0 && (
        <EmptyState title={emptyTitle(props.status)} />
      )}
    </Screen>
  );
}

function emptyTitle(status: ScheduledListViewProps['status']): string {
  if (status === 'loading') return 'Loading Schedules';

  if (status === 'failed') return 'Could not load Schedules';

  return 'No Schedules';
}

function ScheduleRows({
  schedules,
  selectedId,
  onOpen,
}: ScheduledListViewProps): ReactElement {
  const gutterHeld = useSidebarGutterHeld();

  return (
    <List
      fit={false}
      {...sessionsListLook('regular', gutterHeld ? 'inset' : 'padded')}
    >
      {schedules.map((schedule) => (
        <ListItem
          key={schedule.id}
          title={schedule.name}
          subtitle={`${upcomingOccurrence(schedule.nextAt)} · ${intervalLabel(schedule.intervalSeconds)}`}
          selected={selectedId === schedule.id}
          sidebar={gutterHeld}
          onPress={() => onOpen(schedule)}
        />
      ))}
    </List>
  );
}
