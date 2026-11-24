import type { AgentServer, SessionInfo } from '@repo/contracts';
import type { ProjectSchedule } from '@repo/contracts/operations';
import { ListTreeContext } from '@repo/kit/list-tree';
import { NativeSidebarHeader } from '@repo/kit/native-sidebar';
import { Action } from '@repo/kit/primitives/actions/action';
import { List, ListSectionHeader } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { Menu, MenuTrigger } from '@repo/kit/primitives/overlays/menu';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import { useSidebarGutterHeld } from '@repo/kit/sidebar-gutter';
import { use, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import {
  nestedSessionEntries,
  SessionListRow,
  sessionTree,
  useSessionNesting,
  visibleSessionEntries,
  sessionsListHeadingClassName,
  sessionsListLook,
  sessionsListSidebarRows,
  sessionsListTopPadding,
  useSessionsListRowClassName,
} from '#features/sessions';
import { useContentWide } from '#lib/product/content-layout';
import { NativeScheduleRows } from './native-schedule-rows';
import {
  menuEntries,
  scheduleSubtitle,
  type ScheduleMenuProps,
} from './schedule-row-actions';

export type ScheduleRowAction = 'edit' | 'pause' | 'resume' | 'run' | 'delete';

export interface ScheduledListViewProps {
  schedules: readonly ProjectSchedule[];
  selectedId?: string;
  selectedChildId?: string;
  startedSessions?: readonly SessionInfo[];
  agents?: AgentServer[];
  onOpenStarted?: (schedule: ProjectSchedule, sessionId: string) => void;
  onEndReached?: () => void;
  status?: 'loading' | 'failed';
  onCreate: () => void;
  onOpen: (schedule: ProjectSchedule) => void;
  onAction?: (schedule: ProjectSchedule, action: ScheduleRowAction) => void;
}

export function ScheduledListView(props: ScheduledListViewProps): ReactElement {
  const header = use(NativeSidebarHeader);

  if (header)
    return (
      <>
        {header({
          actions: [
            {
              title: 'New Schedule',
              icon: 'new-session',
              onPress: props.onCreate,
            },
          ],
        })}
        <NativeScheduleRows
          entries={scheduleEntries(props, true, new Set())}
          props={props}
          empty={<EmptyState title={emptyTitle(props.status)} />}
        />
      </>
    );

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

type Task = {
  sessionId: string;
  projectId: string;
  startedBySessionId: null;
  schedule: ProjectSchedule;
};

export type NestedEntry = ReturnType<
  typeof nestedSessionEntries<Task | SessionInfo>
>[number];

export type ScheduleEntry = ScheduleSection | NestedEntry;

function scheduleEntries(
  props: ScheduledListViewProps,
  pausedExpanded: boolean,
  folded: ReadonlySet<string>,
): ScheduleEntry[] {
  const roots = props.schedules.map((schedule): Task => ({
    sessionId: schedule.sessionId,
    projectId: schedule.projectId,
    startedBySessionId: null,
    schedule,
  }));

  const entries = nestedSessionEntries<Task | SessionInfo>([
    ...roots,
    ...(props.startedSessions ?? []),
  ]);

  const sections = scheduleSections(visibleSessionEntries(entries, folded));

  return [
    ...(sections.Active.length ? ['Active' as const, ...sections.Active] : []),
    ...(sections.Paused.length
      ? ['Paused' as const, ...(pausedExpanded ? sections.Paused : [])]
      : []),
  ];
}

function scheduleSections(
  entries: readonly NestedEntry[],
): Record<ScheduleSection, NestedEntry[]> {
  const sections: Record<ScheduleSection, NestedEntry[]> = {
    Active: [],
    Paused: [],
  };

  let section: ScheduleSection | undefined;

  for (const entry of entries) {
    if ('schedule' in entry.session) {
      const { schedule } = entry.session;
      section = schedule.paused || schedule.archived ? 'Paused' : 'Active';
    } else if (!entry.tree?.depth) {
      section = undefined;
    }

    if (section) sections[section].push(entry);
  }

  return sections;
}

function entryKind(entry: ScheduleEntry): string {
  if (typeof entry === 'string') return 'section';

  return 'schedule' in entry.session ? 'schedule' : 'session';
}

const entryKey = (entry: ScheduleEntry): string =>
  typeof entry === 'string' ? entry : entry.id;

function ScheduleRows(props: ScheduledListViewProps): ReactElement {
  const gutterHeld = useSidebarGutterHeld();
  const [pausedExpanded, setPausedExpanded] = useState(true);
  const nesting = useSessionNesting(useContentWide());

  const renderEntry = (entry: ScheduleEntry): ReactElement => {
    if (typeof entry !== 'string') return nestedRow(entry, nesting, props);

    const isExpanded = entry === 'Active' || pausedExpanded;

    return (
      <View className={sessionsListHeadingClassName(!isExpanded)}>
        <ListSectionHeader
          title={entry}
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
      items={scheduleEntries(props, pausedExpanded, nesting.folded)}
      extraData={{
        selectedId: props.selectedId,
        selectedChildId: props.selectedChildId,
        pausedExpanded,
      }}
      renderItem={renderEntry}
      keyExtractor={entryKey}
      getItemType={entryKind}
      onEndReached={props.onEndReached}
    />
  );
}

function nestedRow(
  entry: NestedEntry,
  nesting: ReturnType<typeof useSessionNesting>,
  props: ScheduledListViewProps,
): ReactElement {
  const { session } = entry;
  const tree = sessionTree(entry, nesting);

  if ('schedule' in session) {
    return (
      <ListTreeContext value={tree ?? null}>
        <ScheduleRow {...props} schedule={session.schedule} />
      </ListTreeContext>
    );
  }

  return (
    <SessionListRow
      session={session}
      logo={props.agents?.find(({ id }) => id === session.agent)?.icon ?? ''}
      selected={session.sessionId === props.selectedChildId}
      tree={tree}
      onSelect={(id) => {
        const schedule = props.schedules.find(
          ({ sessionId }) => sessionId === session.taskSessionId,
        );

        if (schedule) props.onOpenStarted?.(schedule, id);
      }}
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
  return (
    <View className={useSessionsListRowClassName()}>
      <ListItem
        title={schedule.name}
        subtitle={scheduleSubtitle(schedule)}
        subtitleIcon="clock"
        selected={selectedId === schedule.id}
        sidebar={sessionsListSidebarRows}
        onPress={() => onOpen(schedule)}
        trailingAccessories={
          onAction && <ScheduleMenu schedule={schedule} onAction={onAction} />
        }
      />
    </View>
  );
}

function ScheduleMenu(props: ScheduleMenuProps): ReactElement {
  const label = `Schedule actions for ${props.schedule.name}`;

  return (
    <Menu
      accessibilityLabel={label}
      trigger={<MenuTrigger label={label} icon="more" iconOnly />}
      actions={menuEntries(props)}
    />
  );
}
