import type { ProjectSchedule } from '@repo/contracts/operations';
import { Action } from '@repo/kit/primitives/actions/action';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type { ReactElement } from 'react';

export interface ScheduledListViewProps {
  schedules: readonly ProjectSchedule[];
  selectedId?: string;
  status?: 'loading' | 'failed';
  onCreate: () => void;
  onOpen: (schedule: ProjectSchedule) => void;
}

export const occurrenceTime = (time: number): string =>
  new Date(time).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export function intervalLabel(seconds: number): string {
  if (seconds % 3600 === 0) return `Every ${seconds / 3600} hr`;
  if (seconds % 60 === 0) return `Every ${seconds / 60} min`;
  return `Every ${seconds} sec`;
}

export function ScheduledListView(props: ScheduledListViewProps): ReactElement {
  return (
    <Screen
      title="Scheduled"
      primaryAction={
        <Action label="New Schedule" icon="add" onPress={props.onCreate} />
      }
    >
      {props.schedules.length > 0 && (
        <List appearance="plain" fit={false}>
          {props.schedules.map((schedule) => (
            <ListItem
              key={schedule.id}
              title={schedule.name}
              subtitle={`${intervalLabel(schedule.intervalSeconds)} · Next ${occurrenceTime(schedule.nextAt)}`}
              selected={props.selectedId === schedule.id}
              leading="calendar"
              sidebar
              onPress={() => props.onOpen(schedule)}
            />
          ))}
        </List>
      )}
      {props.schedules.length === 0 && (
        <EmptyState
          title={
            props.status === 'loading'
              ? 'Loading Schedules'
              : props.status === 'failed'
                ? 'Could not load Schedules'
                : 'No Schedules'
          }
        />
      )}
    </Screen>
  );
}
