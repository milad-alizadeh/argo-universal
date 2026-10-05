import { LegendList } from '@legendapp/list';
import type {
  AgentsListOutput,
  ProjectsListOutput,
  SessionInfo,
} from '@repo/contracts';
import {
  DotsThreeIcon,
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
} from 'phosphor-react-native';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text, TextClassContext } from '#primitives/text';
import { Icon } from './Icon';
import { SessionRow } from './SessionRow';

type Entry =
  | { kind: 'project'; id: string; projectId: string; name: string }
  | { kind: 'session'; id: string; session: SessionInfo }
  | { kind: 'empty'; id: string };

export interface ProjectsListProps {
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

export function ProjectsList({
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
}: ProjectsListProps) {
  const gradientId = useId().replace(/:/g, '');
  const { backgroundColor } = useResolveClassNames(
    'bg-background wide:bg-sidebar',
  );
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const contentStyle = {
    paddingHorizontal: 8,
    paddingTop: 20,
    paddingBottom: 28,
  };
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
      className="relative flex-1 overflow-hidden bg-background wide:bg-sidebar web:select-none web:[&_*]:select-none! web:[&_[data-testid=projects-scroll]>div>div>div]:transition-[top,transform] web:[&_[data-testid=projects-scroll]>div>div>div]:duration-200"
      style={{ minHeight: 0 }}
    >
      <View className="flex-1" style={{ minHeight: 0 }}>
        <LegendList
          testID="projects-scroll"
          style={{ flex: 1 }}
          contentContainerStyle={contentStyle}
          data={entries}
          keyExtractor={(entry) => entry.id}
          estimatedItemSize={76}
          ItemSeparatorComponent={ProjectEntrySeparator}
          recycleItems={false}
          extraData={{ agents, collapsed, selectedSessionId }}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
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
          renderItem={({ item }) => {
            if (item.kind === 'empty')
              return (
                <Text className="pb-1 pl-session-name pr-1 text-xs leading-4 text-muted-foreground">
                  No Sessions yet.
                </Text>
              );
            if (item.kind === 'session')
              return (
                <View
                  testID="session-row-surface"
                  className={cn(
                    'overflow-hidden bg-background wide:bg-sidebar',
                    selectedSessionId === item.id &&
                      'bg-sidebar-accent wide:bg-sidebar-accent',
                  )}
                >
                  <SessionRow
                    key={item.id}
                    session={item.session}
                    logo={
                      agents.find((agent) => agent.agent === item.session.agent)
                        ?.logo ?? ''
                    }
                    selected={selectedSessionId === item.id}
                    onSelect={onSelect}
                  />
                </View>
              );
            const isCollapsed = collapsed.has(item.id);
            return (
              <ProjectHeading
                name={item.name}
                collapsed={isCollapsed}
                onNewSession={
                  onNewSession && (() => onNewSession(item.projectId))
                }
                onProjectSettings={
                  onProjectSettings && (() => onProjectSettings(item.name))
                }
                onToggle={() =>
                  setCollapsed((current) => {
                    const next = new Set(current);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
              />
            );
          }}
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

function ProjectHeading({
  name,
  collapsed,
  onToggle,
  onNewSession,
  onProjectSettings,
}: {
  name: string;
  collapsed: boolean;
  onToggle: () => void;
  onNewSession?: () => void;
  onProjectSettings?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const actionsVisible = Platform.OS !== 'web' || hovered || focused;
  const interactionEvents = {
    onHoverIn: () => setHovered(true),
    onHoverOut: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={cn(
        'h-10 wide:h-8 flex-row items-center rounded-md pr-1',
        (hovered || focused) && 'bg-sidebar-accent',
      )}
    >
      <Button
        variant="ghost"
        accessibilityLabel={name}
        accessibilityState={{ expanded: !collapsed }}
        aria-expanded={!collapsed}
        className="h-full sm:h-full min-w-0 flex-1 justify-start gap-2 pl-2.5 pr-2 py-1 hover:bg-transparent dark:hover:bg-transparent web:has-[>svg]:pl-2.5 web:has-[>svg]:pr-2"
        onPress={onToggle}
        {...interactionEvents}
      >
        <TextClassContext.Provider value={undefined}>
          <Icon
            as={collapsed ? FolderIcon : FolderOpenIcon}
            className="size-4 text-muted-foreground wide:text-foreground"
          />
          <Text
            numberOfLines={1}
            className="min-w-0 flex-1 text-base leading-6 font-semibold wide:text-sm wide:leading-5 wide:font-medium"
          >
            {name}
          </Text>
        </TextClassContext.Provider>
      </Button>
      <View
        className={cn(
          'flex-row items-center gap-0.5',
          !actionsVisible && 'opacity-0',
        )}
      >
        <Button
          variant="ghost"
          accessibilityLabel={`Project settings for ${name}`}
          className="size-6 sm:size-6 rounded-sm p-0 web:has-[>svg]:px-0"
          onPress={onProjectSettings}
          disabled={!onProjectSettings}
          {...interactionEvents}
        >
          <Icon as={DotsThreeIcon} className="size-3.5 text-foreground" />
        </Button>
        <Button
          variant="ghost"
          accessibilityLabel={`New Session in ${name}`}
          className="size-6 sm:size-6 rounded-sm p-0 web:has-[>svg]:px-0"
          onPress={onNewSession}
          disabled={!onNewSession}
          {...interactionEvents}
        >
          <Icon as={PlusIcon} className="size-3.5 text-foreground" />
        </Button>
      </View>
    </Pressable>
  );
}

function ProjectEntrySeparator() {
  return <View className="h-0 wide:h-0.5" />;
}
