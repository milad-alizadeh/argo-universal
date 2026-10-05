import { LegendList } from '@legendapp/list';
import type {
  AgentsListOutput,
  ProjectsListOutput,
  SessionInfo,
} from '@repo/contracts';
import { FolderIcon, FolderOpenIcon } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
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
    <LegendList
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
              No {archived ? 'Archived' : 'Active'} Session has "{query}" in its
              title.
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
                className="size-4"
              />
              <Text
                numberOfLines={1}
                className="min-w-0 flex-1 text-sm font-medium"
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
  );
}
