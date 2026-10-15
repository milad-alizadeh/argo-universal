import type * as React from 'react';
import { memo, useCallback } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/display/text';
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

function noMatchingSession({
  query,
  archived,
}: EmptySessionsListProps): string | undefined {
  if (!query) return undefined;

  return `No ${archived ? 'Archived' : 'Active'} Session has "${query}" in its title.`;
}

export interface EmptyListProps {
  title: string;
  // Why the list is empty, such as which search found nothing.
  message?: string;
}

function EmptyListMessage({
  message,
}: Pick<EmptyListProps, 'message'>): React.JSX.Element | null {
  if (!message) return null;

  return (
    <Text role="secondary" className="text-center">
      {message}
    </Text>
  );
}

// What a list shows in place of rows it does not have: a heading, and a line on why. Settings' search shows it too.
export function EmptyList({
  title,
  message,
}: EmptyListProps): React.JSX.Element {
  return (
    <View className="items-center gap-1 px-4 py-8">
      <Text role={'heading'} className="text-center">
        {title}
      </Text>
      <EmptyListMessage message={message} />
    </View>
  );
}

export function EmptySessionsList(
  props: EmptySessionsListProps,
): React.JSX.Element {
  return (
    <EmptyList
      title={emptyListTitle(props)}
      message={noMatchingSession(props)}
    />
  );
}

type SessionListRowProps = Pick<
  SessionRowProps,
  'session' | 'logo' | 'selected' | 'trailing' | 'onSelect'
>;

export const SessionListRow = memo(function SessionListRow(
  props: SessionListRowProps,
) {
  return (
    <View
      testID="session-row-surface"
      className={cn(
        'overflow-hidden bg-content wide:bg-transparent wide:pb-px',
        props.selected && 'bg-muted wide:bg-transparent',
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
