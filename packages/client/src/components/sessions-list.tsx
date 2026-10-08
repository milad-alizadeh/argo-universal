import {
  LegendList,
  type LegendListRenderItemProps,
} from '@legendapp/list/react-native';
import type {
  AgentsListOutput,
  ProjectsListOutput,
  SessionInfo,
} from '@repo/contracts';
import {
  memo,
  type ReactElement,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  type ScrollView,
  View,
} from 'react-native';
import { useCSSVariable } from 'uniwind';
import { hasLiquidGlass } from '#lib/native-header';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { listTestIdProps } from '../lib/list-test-id';
import { useWide } from '../navigation/use-wide';
import { ProjectHeading } from './project-heading';
import { ScrollFade, useScrollFadeEdges } from './scroll-fade';
import { SessionRow, type SessionRowProps } from './session-row';
import { listEntries, type SessionsListEntry } from './sessions-list-entries';

const contentStyle = {
  paddingHorizontal: 8,
  paddingTop: 20,
  paddingBottom: 28,
};

function entryKey(entry: SessionsListEntry) {
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
  // Scrolls with the rows, above the first Project.
  header?: ReactElement;
}

// Which Project headings are collapsed, and the toggle for one.
function useCollapsedProjects() {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const toggleProject = useCallback((id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  return { collapsed, toggleProject };
}

// A phone list sits at the screen's list inset, like every other phone list.
function useContentStyle(wide: boolean) {
  const screenListInset = Number.parseFloat(
    String(useCSSVariable('--spacing-gutter-list')),
  );
  const phoneContentStyle = useMemo(
    () => ({ ...contentStyle, paddingHorizontal: screenListInset }),
    [screenListInset],
  );
  return wide ? contentStyle : phoneContentStyle;
}

// When the next page starts loading while the reader is at the end, scrolls the loading footer into view.
function useRevealLoadingFooter(isFetchingNextPage: boolean) {
  const scrollView = useRef<ScrollView>(null);
  const atEnd = useRef(false);
  const revealPending = useRef(false);
  useLayoutEffect(() => {
    revealPending.current = isFetchingNextPage && atEnd.current;
  }, [isFetchingNextPage]);
  return {
    scrollView,
    trackAtEnd: ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
      atEnd.current =
        contentSize.height - contentOffset.y - layoutMeasurement.height <= 2;
    },
    revealIfPending: () => {
      if (!revealPending.current) return;
      revealPending.current = false;
      requestAnimationFrame(() => {
        scrollView.current?.scrollToEnd({ animated: false });
      });
    },
  };
}

// On native, rows that move, appear or leave animate into place.
function useAnimateReorder(entries: SessionsListEntry[]) {
  const entryOrder = entries.map((entry) => entry.id).join('|');
  const previousOrder = useRef(entryOrder);
  useLayoutEffect(() => {
    if (previousOrder.current !== entryOrder && Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    previousOrder.current = entryOrder;
  }, [entryOrder]);
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
  header,
}: SessionsListProps) {
  const contentContainerStyle = useContentStyle(useWide());
  const loadingFooter = useRevealLoadingFooter(isFetchingNextPage);
  // The top fade shows once content has scrolled under the header.
  const scrollFade = useScrollFadeEdges();
  const { collapsed, toggleProject } = useCollapsedProjects();
  const entries = useMemo(
    () => listEntries(projects, sessions, collapsed, !!query || archived),
    [projects, sessions, query, archived, collapsed],
  );
  useAnimateReorder(entries);

  const agentLogos = useMemo(
    () => new Map(agents.map((agent) => [agent.agent, agent.logo])),
    [agents],
  );
  const extraData = useMemo(
    () => ({ agents, collapsed, selectedSessionId }),
    [agents, collapsed, selectedSessionId],
  );
  const renderItem = useCallback(
    ({ item }: LegendListRenderItemProps<SessionsListEntry>) => {
      if (item.kind === 'empty') return <NoSessionsYet />;
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

  return (
    <View
      className="relative flex-1 overflow-hidden bg-background wide:bg-sidebar web:select-none web:[&_*]:select-none! web:[&_[data-testid=sessions-scroll]>div>div>div]:transition-[top,transform] web:[&_[data-testid=sessions-scroll]>div>div>div]:duration-200"
      style={{ minHeight: 0 }}
    >
      <View className="flex-1" style={{ minHeight: 0 }}>
        <LegendList
          refScrollView={loadingFooter.scrollView}
          {...listTestIdProps('sessions-scroll')}
          style={{ flex: 1 }}
          contentContainerStyle={contentContainerStyle}
          // On iOS it scrolls by the fade's top padding on mount, then snaps back.
          maintainVisibleContentPosition={false}
          data={entries}
          keyExtractor={entryKey}
          estimatedItemSize={76}
          ItemSeparatorComponent={ProjectEntrySeparator}
          recycleItems={false}
          extraData={extraData}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={header}
          onScroll={(event) => {
            scrollFade.onScroll(event);
            loadingFooter.trackAtEnd(event);
          }}
          onContentSizeChange={loadingFooter.revealIfPending}
          ListFooterComponent={
            isFetchingNextPage ? <LoadingMoreSessions /> : null
          }
          ListEmptyComponent={
            <EmptySessionsList query={query} archived={archived} />
          }
          renderItem={renderItem}
        />
      </View>
      {scrollFade.edges.top && !hasLiquidGlass && (
        <ScrollFade edge="top" className={fadeSurface} />
      )}
      <ScrollFade edge="bottom" className={fadeSurface} />
    </View>
  );
}

function NoSessionsYet() {
  return (
    <Text className="pb-1 pl-session-name pr-1 text-xs leading-4 text-muted-foreground">
      No Sessions yet.
    </Text>
  );
}

function LoadingMoreSessions() {
  return (
    <View className="h-24 items-center justify-center">
      <ActivityIndicator
        role="progressbar"
        accessibilityLabel="Loading more Sessions"
        colorClassName="accent-muted-foreground"
        size="small"
      />
    </View>
  );
}

function emptyListTitle(query: string, archived: boolean) {
  if (query) return 'No matching Sessions';
  if (archived) return 'No archived Sessions';
  return 'No Projects yet';
}

function EmptySessionsList({
  query,
  archived,
}: {
  query: string;
  archived: boolean;
}) {
  return (
    <View className="items-center gap-1 px-4 py-8">
      <Text className="text-center text-sm font-medium">
        {emptyListTitle(query, archived)}
      </Text>
      {query ? (
        <Text className="text-center text-xs text-muted-foreground">
          No {archived ? 'Archived' : 'Active'} Session has "{query}" in its
          title.
        </Text>
      ) : null}
    </View>
  );
}

const fadeSurface = 'bg-background wide:bg-sidebar';

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
