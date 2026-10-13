import type * as React from 'react';
import { memo, useCallback } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/display/text/text';
import {
  ProjectHeading,
  type ProjectHeadingProps,
} from '../project-heading/project-heading';
import { SessionRow, type SessionRowProps } from '../session-row/session-row';

export function NoSessionsYet(): React.JSX.Element {
  return (
    <Text role="secondary" className="pb-1 pl-session-name pr-1">
      No Sessions yet.
    </Text>
  );
}

interface EmptySessionsListProps {
  query: string;
  archived: boolean;
}

function emptyListTitle({
  query,
  archived,
}: EmptySessionsListProps):
  | 'No matching Sessions'
  | 'No archived Sessions'
  | 'No Projects yet' {
  if (query) return 'No matching Sessions';

  if (archived) return 'No archived Sessions';

  return 'No Projects yet';
}

function NoMatchingSession({
  query,
  archived,
}: EmptySessionsListProps): React.JSX.Element | null {
  if (!query) return null;

  return (
    <Text role="secondary" className="text-center">
      No {archived ? 'Archived' : 'Active'} Session has "{query}" in its title.
    </Text>
  );
}

export function EmptySessionsList(
  props: EmptySessionsListProps,
): React.JSX.Element {
  return (
    <View className="items-center gap-1 px-4 py-8">
      <Text role={'heading'} className="text-center">
        {emptyListTitle(props)}
      </Text>
      <NoMatchingSession {...props} />
    </View>
  );
}

export const SessionListRow = memo(function SessionListRow(
  props: Pick<SessionRowProps, 'session' | 'logo' | 'selected' | 'onSelect'>,
) {
  return (
    <View
      testID="session-row-surface"
      className={cn(
        'overflow-hidden bg-sidebar wide:bg-transparent',
        props.selected && 'bg-sidebar-accent wide:bg-transparent',
      )}
    >
      <SessionRow {...props} />
    </View>
  );
});

export interface ProjectListHeadingProps {
  id: string;
  projectId: string;
  name: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  onNewSession?: (projectId: string) => void;
  onProjectSettings?: (projectName: string) => void;
}

function useProjectAction(
  action: ((argument: string) => void) | undefined,
  argument: string,
): (() => void) | undefined {
  const run = useCallback(() => action?.(argument), [action, argument]);

  return action ? run : undefined;
}

type HeadingActions = Pick<
  ProjectHeadingProps,
  'onToggle' | 'onAdd' | 'onProjectSettings'
>;

function useHeadingActions(props: ProjectListHeadingProps): HeadingActions {
  const { id, onToggle } = props;
  const toggle = useCallback(() => onToggle(id), [id, onToggle]);

  return {
    onToggle: toggle,
    onAdd: useProjectAction(props.onNewSession, props.projectId),
    onProjectSettings: useProjectAction(props.onProjectSettings, props.name),
  };
}

export const ProjectListHeading = memo(function ProjectListHeading(
  props: ProjectListHeadingProps,
) {
  const actions = useHeadingActions(props);

  return (
    <ProjectHeading
      name={props.name}
      collapsed={props.collapsed}
      addLabel={`New Session in ${props.name}`}
      {...actions}
    />
  );
});
