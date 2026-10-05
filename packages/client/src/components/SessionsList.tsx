import {
  LegendList,
  type LegendListRef,
  type LegendListRenderItemProps,
} from '@legendapp/list';
import type {
  AgentsListOutput,
  ProjectsListOutput,
  SessionInfo,
} from '@repo/contracts';
import {
  memo,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { ProjectHeading } from './ProjectHeading';
import { SessionRow, type SessionRowProps } from './SessionRow';

type Entry =
  | { kind: 'project'; id: string; projectId: string; name: string }
  | { kind: 'session'; id: string; session: SessionInfo }
  | { kind: 'empty'; id: string };

const contentStyle = {
  paddingHorizontal: 8,
  paddingTop: 20,
  paddingBottom: 28,
};

function entryKey(entry: Entry) {
  return entry.id;
}

export interface SessionsListProps {
  projects: ProjectsListOutput;
  agents: AgentsListOutput;
  sessions: SessionInfo[];
  query: string;
  archived: boolean;
  selectedSessionId?: string;
  onSelect: (id: string) => void;
  onEndReached: () => void;
  isFetchingNextPage?: boolean;
  onNewSession?: (projectId: string) => void;
  onProjectSettings?: (projectName: string) => void;
}

export function SessionsList({
  projects,
  agents,
  sessions,
  query,
  archived,
  selectedSessionId,
  onSelect,
  onEndReached,
  isFetchingNextPage = false,
  onNewSession,
  onProjectSettings,
}: SessionsListProps) {
  const gradientId = useId().replace(/:/g, '');
  const list = useRef<LegendListRef>(null);
  const atEnd = useRef(false);
  const revealLoadingFooter = useRef(false);
  useLayoutEffect(() => {
    revealLoadingFooter.current = isFetchingNextPage && atEnd.current;
  }, [isFetchingNextPage]);
  const { backgroundColor } = useResolveClassNames(
    'bg-background wide:bg-sidebar',
  );
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const entries = useMemo(() => {
    const groups = new Map<string, SessionInfo[]>();
    for (const session of sessions) {
      const group = groups.get(session.projectId) ?? [];
      group.push(session);
      groups.set(session.projectId, group);
    }
    const result: Entry[] = [];
    for (const project of projects) {
      const group = (groups.get(project.id) ?? []).sort(
        (a, b) =>
          b.activityAt - a.activityAt || a.sessionId.localeCompare(b.sessionId),
      );
      if ((query || archived) && group.length === 0) continue;
      result.push({
        kind: 'project',
        id: `project:${project.id}`,
        name: project.name,
        projectId: project.id,
      });
      if (collapsed.has(`project:${project.id}`)) continue;
      if (group.length === 0)
        result.push({ kind: 'empty', id: `empty:${project.id}` });
      for (const session of group)
        result.push({ kind: 'session', id: session.sessionId, session });
    }
    return result;
  }, [projects, sessions, query, archived, collapsed]);

  const agentLogos = useMemo(
    () => new Map(agents.map((agent) => [agent.agent, agent.logo])),
    [agents],
  );
  const extraData = useMemo(
    () => ({ agents, collapsed, selectedSessionId }),
    [agents, collapsed, selectedSessionId],
  );
  const toggleProject = useCallback((id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const renderItem = useCallback(
    ({ item }: LegendListRenderItemProps<Entry>) => {
      if (item.kind === 'empty')
        return (
          <Text className="pb-1 pl-session-name pr-1 text-xs leading-4 text-muted-foreground">
            No Sessions yet.
          </Text>
        );
      if (item.kind === 'session')
        return (
          <SessionListRow
            session={item.session}
            logo={agentLogos.get(item.session.agent) ?? ''}
            selected={selectedSessionId === item.id}
            onSelect={onSelect}
          />
        );
      return (
        <ProjectListHeading
          id={item.id}
          projectId={item.projectId}
          name={item.name}
          collapsed={collapsed.has(item.id)}
          onToggle={toggleProject}
          onNewSession={onNewSession}
          onProjectSettings={onProjectSettings}
        />
      );
    },
    [
      agentLogos,
      collapsed,
      selectedSessionId,
      onSelect,
      toggleProject,
      onNewSession,
      onProjectSettings,
    ],
  );

  const entryOrder = entries.map((entry) => entry.id).join('|');
  const previousOrder = useRef(entryOrder);
  useLayoutEffect(() => {
    if (previousOrder.current !== entryOrder && Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    previousOrder.current = entryOrder;
  }, [entryOrder]);

  return (
    <View
      className="relative flex-1 overflow-hidden bg-background wide:bg-sidebar web:select-none web:[&_*]:select-none! web:[&_[data-testid=sessions-scroll]>div>div>div]:transition-[top,transform] web:[&_[data-testid=sessions-scroll]>div>div>div]:duration-200"
      style={{ minHeight: 0 }}
    >
      <View className="flex-1" style={{ minHeight: 0 }}>
        <LegendList
          ref={list}
          testID="sessions-scroll"
          style={{ flex: 1 }}
          contentContainerStyle={contentStyle}
          data={entries}
          keyExtractor={entryKey}
          estimatedItemSize={76}
          ItemSeparatorComponent={ProjectEntrySeparator}
          recycleItems={false}
          extraData={extraData}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          onScroll={({ nativeEvent }) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              nativeEvent;
            atEnd.current =
              contentSize.height - contentOffset.y - layoutMeasurement.height <=
              2;
          }}
          onContentSizeChange={() => {
            if (!revealLoadingFooter.current) return;
            revealLoadingFooter.current = false;
            requestAnimationFrame(() => {
              list.current?.scrollToEnd({ animated: false });
            });
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="h-24 items-center justify-center">
                <ActivityIndicator
                  role="progressbar"
                  accessibilityLabel="Loading more Sessions"
                  colorClassName="accent-muted-foreground"
                  size="small"
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center gap-1 px-4 py-8">
              <Text className="text-center text-sm font-medium">
                {query
                  ? 'No matching Sessions'
                  : archived
                    ? 'No archived Sessions'
                    : 'No Projects yet'}
              </Text>
              {query && (
                <Text className="text-center text-xs text-muted-foreground">
                  No {archived ? 'Archived' : 'Active'} Session has "{query}" in
                  its title.
                </Text>
              )}
            </View>
          }
          renderItem={renderItem}
        />
      </View>
      {(['top', 'bottom'] as const).map((edge) => (
        <View
          key={edge}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID={`scroll-fade-${edge}`}
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              zIndex: 10,
              height: edge === 'top' ? 20 : 28,
              ...(edge === 'top' ? { top: 0 } : { bottom: 0 }),
            },
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient
                id={`${gradientId}-${edge}`}
                x1="0"
                y1="0%"
                x2="0"
                y2="100%"
              >
                <Stop
                  offset="0"
                  stopColor={backgroundColor}
                  stopOpacity={edge === 'top' ? 1 : 0}
                />
                <Stop
                  offset="0.5"
                  stopColor={backgroundColor}
                  stopOpacity={0.85}
                />
                <Stop
                  offset="1"
                  stopColor={backgroundColor}
                  stopOpacity={edge === 'top' ? 0 : 1}
                />
              </LinearGradient>
            </Defs>
            <Rect
              width="100%"
              height="100%"
              fill={`url(#${gradientId}-${edge})`}
            />
          </Svg>
        </View>
      ))}
    </View>
  );
}

function ProjectEntrySeparator() {
  return <View className="h-0 wide:h-0.5" />;
}

const SessionListRow = memo(function SessionListRow({
  session,
  logo,
  selected,
  onSelect,
}: Pick<SessionRowProps, 'session' | 'logo' | 'selected' | 'onSelect'>) {
  return (
    <View
      testID="session-row-surface"
      className={cn(
        'overflow-hidden bg-background wide:bg-sidebar',
        selected && 'bg-sidebar-accent wide:bg-sidebar-accent',
      )}
    >
      <SessionRow
        session={session}
        logo={logo}
        selected={selected}
        onSelect={onSelect}
      />
    </View>
  );
});

interface ProjectListHeadingProps {
  id: string;
  projectId: string;
  name: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  onNewSession?: SessionsListProps['onNewSession'];
  onProjectSettings?: SessionsListProps['onProjectSettings'];
}

const ProjectListHeading = memo(function ProjectListHeading({
  id,
  projectId,
  name,
  collapsed,
  onToggle,
  onNewSession,
  onProjectSettings,
}: ProjectListHeadingProps) {
  const toggle = useCallback(() => onToggle(id), [id, onToggle]);
  const addSession = useCallback(
    () => onNewSession?.(projectId),
    [onNewSession, projectId],
  );
  const openSettings = useCallback(
    () => onProjectSettings?.(name),
    [onProjectSettings, name],
  );
  return (
    <ProjectHeading
      name={name}
      collapsed={collapsed}
      addLabel={`New Session in ${name}`}
      onToggle={toggle}
      onAdd={onNewSession ? addSession : undefined}
      onProjectSettings={onProjectSettings ? openSettings : undefined}
    />
  );
});
