import { LegendList } from '@legendapp/list';
import type {
  AgentsListOutput,
  ProjectsListOutput,
  SessionInfo,
} from '@repo/contracts';
import { FolderIcon, FolderOpenIcon } from 'phosphor-react-native';
import { useId, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { Button } from '#primitives/button';
import { Text, TextClassContext } from '#primitives/text';
import { Icon } from './Icon';
import { SessionRow } from './SessionRow';

type Entry =
  | { kind: 'project'; id: string; name: string; count: number }
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
}: ProjectsListProps) {
  const gradientId = useId();
  const { backgroundColor } = useResolveClassNames(
    'bg-background wide:bg-sidebar',
  );
  const scroll = useRef({ offset: 0, content: 0, viewport: 0 });
  const [fades, setFades] = useState({ top: false, bottom: false });
  function updateFades() {
    const { offset, content, viewport } = scroll.current;
    const top = offset > 1;
    const bottom = viewport > 0 && content - viewport - offset > 1;
    setFades((current) =>
      current.top === top && current.bottom === bottom
        ? current
        : { top, bottom },
    );
  }
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const contentStyle = useResolveClassNames('px-2 pb-24 wide:pb-2');
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
        count: group.length,
      });
      if (collapsed.has(`project:${project.id}`)) continue;
      if (group.length === 0)
        result.push({ kind: 'empty', id: `empty:${project.id}` });
      for (const session of group)
        result.push({ kind: 'session', id: session.sessionId, session });
    }
    return result;
  }, [projects, sessions, query, archived, collapsed]);

  return (
    <View
      className="relative flex-1 overflow-hidden"
      style={{ minHeight: 0 }}
      onLayout={({ nativeEvent }) => {
        scroll.current.viewport = nativeEvent.layout.height;
        updateFades();
      }}
    >
      <LegendList
        testID="projects-scroll"
        onContentSizeChange={(_width, height) => {
          scroll.current.content = height;
          updateFades();
        }}
        onScroll={({ nativeEvent }) => {
          scroll.current.offset = Math.max(0, nativeEvent.contentOffset.y);
          updateFades();
        }}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={contentStyle}
        data={entries}
        keyExtractor={(entry) => entry.id}
        estimatedItemSize={76}
        recycleItems={false}
        extraData={{ agents, collapsed, selectedSessionId }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
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
            );
          const isCollapsed = collapsed.has(item.id);
          return (
            <Button
              variant="ghost"
              accessibilityLabel={
                isCollapsed ? `${item.name}, ${item.count} Sessions` : item.name
              }
              accessibilityState={{ expanded: !isCollapsed }}
              aria-expanded={!isCollapsed}
              className="h-10 sm:h-10 wide:h-8 wide:sm:h-8 justify-start gap-2 rounded-md pl-2.5 pr-1 py-1"
              onPress={() =>
                setCollapsed((current) => {
                  const next = new Set(current);
                  if (next.has(item.id)) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                })
              }
            >
              <TextClassContext.Provider value={undefined}>
                <Icon
                  as={isCollapsed ? FolderIcon : FolderOpenIcon}
                  className="size-4 text-muted-foreground wide:text-foreground"
                />
                <Text
                  numberOfLines={1}
                  className="min-w-0 flex-1 text-base leading-6 font-semibold wide:text-sm wide:leading-5 wide:font-medium"
                >
                  {item.name}
                </Text>
                {isCollapsed && (
                  <Text className="pr-1.5 text-xs text-muted-foreground">
                    {item.count}
                  </Text>
                )}
              </TextClassContext.Provider>
            </Button>
          );
        }}
      />
      {(['top', 'bottom'] as const).map(
        (edge) =>
          fades[edge] && (
            <View
              key={edge}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              testID={`scroll-fade-${edge}`}
              className={
                edge === 'top'
                  ? 'absolute inset-x-0 top-0 h-8'
                  : 'absolute inset-x-0 bottom-0 h-12'
              }
            >
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient
                    id={`${gradientId}-${edge}`}
                    x1="0"
                    y1={edge === 'top' ? '100%' : '0'}
                    x2="0"
                    y2={edge === 'top' ? '0' : '100%'}
                  >
                    <Stop
                      offset="0"
                      stopColor={backgroundColor}
                      stopOpacity={0}
                    />
                    <Stop
                      offset="0.5"
                      stopColor={backgroundColor}
                      stopOpacity={0.85}
                    />
                    <Stop
                      offset="1"
                      stopColor={backgroundColor}
                      stopOpacity={1}
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
          ),
      )}
    </View>
  );
}
