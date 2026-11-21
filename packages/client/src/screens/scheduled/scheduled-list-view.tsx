import type { ProjectSchedule } from '@repo/contracts/operations';
import { Action } from '@repo/kit/primitives/actions/action';
import { Icon } from '@repo/kit/primitives/content/icon';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import { useSidebarGutterHeld } from '@repo/kit/sidebar-gutter';
import { useState, type ReactElement } from 'react';
import { sessionsListLook } from '#features/sessions';
import {
  cadenceLabel,
  upcomingOccurrence,
  scheduleTimeZone,
} from './schedule-time';

export type ScheduleRowAction =
  | 'edit'
  | 'pause'
  | 'resume'
  | 'history'
  | 'delete';

export interface ScheduledListViewProps {
  schedules: readonly ProjectSchedule[];
  selectedId?: string;
  status?: 'loading' | 'failed';
  onCreate: () => void;
  onOpen: (schedule: ProjectSchedule) => void;
  onAction?: (schedule: ProjectSchedule, action: ScheduleRowAction) => void;
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

function ScheduleRows(props: ScheduledListViewProps): ReactElement {
  const gutterHeld = useSidebarGutterHeld();
  const [pausedExpanded, setPausedExpanded] = useState(false);

  const active = props.schedules.filter(({ paused }) => !paused);
  const paused = props.schedules.filter((schedule) => schedule.paused);

  const renderRow = (schedule: ProjectSchedule): ReactElement => (
    <ScheduleRow
      key={schedule.id}
      {...props}
      schedule={schedule}
      sidebar={gutterHeld}
    />
  );

  return (
    <List
      fit={false}
      {...sessionsListLook('regular', gutterHeld ? 'inset' : 'padded')}
    >
      {active.length > 0 && (
        <List.Section title="Active">{active.map(renderRow)}</List.Section>
      )}
      {paused.length > 0 && (
        <List.Section
          title="Paused"
          isExpanded={pausedExpanded}
          onExpandedChange={setPausedExpanded}
          leading={
            <Icon
              name={pausedExpanded ? 'chevron-down' : 'chevron-right'}
              size="sm"
            />
          }
        >
          {paused.map(renderRow)}
        </List.Section>
      )}
    </List>
  );
}

type ScheduleRowProps = Pick<
  ScheduledListViewProps,
  'selectedId' | 'onOpen' | 'onAction'
> & {
  schedule: ProjectSchedule;
  sidebar: boolean;
};

function ScheduleRow({
  schedule,
  sidebar,
  selectedId,
  onOpen,
  onAction,
}: ScheduleRowProps): ReactElement {
  const cadence = cadenceLabel(schedule.cadence);

  const subtitle = schedule.paused
    ? cadence
    : `${upcomingOccurrence(schedule.nextAt, scheduleTimeZone(schedule.cadence))} · ${cadence}`;

  return (
    <ListItem
      title={schedule.name}
      subtitle={subtitle}
      selected={selectedId === schedule.id}
      sidebar={sidebar}
      onPress={() => onOpen(schedule)}
      actions={onAction && scheduleActions({ schedule, onAction })}
    />
  );
}

function scheduleActions({
  schedule,
  onAction,
}: {
  schedule: ProjectSchedule;
  onAction: NonNullable<ScheduledListViewProps['onAction']>;
}): ReactElement {
  return (
    <Action.Section>
      <Action
        label="Edit"
        icon="edit"
        onPress={() => onAction(schedule, 'edit')}
      />
      {schedule.paused ? (
        <Action
          label="Resume"
          icon="play"
          onPress={() => onAction(schedule, 'resume')}
        />
      ) : (
        <Action
          label="Pause"
          icon="pause"
          onPress={() => onAction(schedule, 'pause')}
        />
      )}
      <Action
        label="History"
        icon="clock"
        onPress={() => onAction(schedule, 'history')}
      />
      <Action
        label="Delete"
        icon="delete"
        onPress={() => onAction(schedule, 'delete')}
      />
    </Action.Section>
  );
}
