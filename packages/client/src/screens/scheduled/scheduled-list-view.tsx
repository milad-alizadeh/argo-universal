import type { ProjectSchedule } from '@repo/contracts/operations';
import { Action } from '@repo/kit/primitives/actions/action';
import { Icon } from '@repo/kit/primitives/content/icon';
import { List, ListSectionHeader } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import { useSidebarGutterHeld } from '@repo/kit/sidebar-gutter';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import {
  sessionsListHeadingClassName,
  sessionsListLook,
  sessionsListSidebarRows,
  sessionsListTopPadding,
  useSessionsListRowClassName,
} from '#features/sessions';
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

type ScheduleSection = 'Active' | 'Paused';

type ScheduleEntry = ScheduleSection | ProjectSchedule;

const scheduleMark = <Icon name="clock" />;

function scheduleEntries(
  schedules: readonly ProjectSchedule[],
  pausedExpanded: boolean,
): ScheduleEntry[] {
  const active = schedules.filter(({ paused }) => !paused);
  const paused = schedules.filter((schedule) => schedule.paused);

  const entries: ScheduleEntry[] = [];

  if (active.length > 0) entries.push('Active', ...active);

  if (paused.length > 0)
    entries.push('Paused', ...(pausedExpanded ? paused : []));

  return entries;
}

const entryKind = (entry: ScheduleEntry): 'section' | 'schedule' =>
  typeof entry === 'string' ? 'section' : 'schedule';

const entryKey = (entry: ScheduleEntry): string =>
  typeof entry === 'string' ? entry : `schedule:${entry.id}`;

function entrySection(entry: ScheduleEntry): string {
  if (typeof entry === 'string') return `heading:${entry}`;

  return entry.paused ? 'Paused' : 'Active';
}

function ScheduleRows(props: ScheduledListViewProps): ReactElement {
  const gutterHeld = useSidebarGutterHeld();
  const [pausedExpanded, setPausedExpanded] = useState(false);

  const renderEntry = (entry: ScheduleEntry): ReactElement => {
    if (typeof entry !== 'string')
      return <ScheduleRow {...props} schedule={entry} />;

    const isExpanded = entry === 'Active' || pausedExpanded;

    return (
      <View className={sessionsListHeadingClassName(!isExpanded)}>
        <ListSectionHeader
          title={entry}
          leading={entry === 'Active' ? scheduleMark : undefined}
          sidebar={sessionsListSidebarRows}
          rowLanes
          isExpanded={isExpanded}
          onExpandedChange={entry === 'Paused' ? setPausedExpanded : undefined}
        />
      </View>
    );
  };

  return (
    <List
      fit={false}
      {...sessionsListLook('regular', gutterHeld ? 'inset' : 'padded')}
      paddingTop={sessionsListTopPadding}
      items={scheduleEntries(props.schedules, pausedExpanded)}
      extraData={{ selectedId: props.selectedId, pausedExpanded }}
      renderItem={renderEntry}
      keyExtractor={entryKey}
      getItemType={entryKind}
      getSectionKey={entrySection}
    />
  );
}

type ScheduleRowProps = Pick<
  ScheduledListViewProps,
  'selectedId' | 'onOpen' | 'onAction'
> & {
  schedule: ProjectSchedule;
};

function ScheduleRow({
  schedule,
  selectedId,
  onOpen,
  onAction,
}: ScheduleRowProps): ReactElement {
  const cadence = cadenceLabel(schedule.cadence);

  const subtitle = schedule.paused
    ? cadence
    : `${upcomingOccurrence(schedule.nextAt, scheduleTimeZone(schedule.cadence))} · ${cadence}`;

  return (
    <View className={useSessionsListRowClassName()}>
      <ListItem
        title={schedule.name}
        subtitle={subtitle}
        leading={scheduleMark}
        selected={selectedId === schedule.id}
        sidebar={sessionsListSidebarRows}
        onPress={() => onOpen(schedule)}
        actions={onAction && scheduleActions({ schedule, onAction })}
      />
    </View>
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
