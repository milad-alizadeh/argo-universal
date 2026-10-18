import type * as React from 'react';
import { memo, useCallback } from 'react';
import Animated from 'react-native-reanimated';
import { Text } from '#primitives/content/text';
import {
  ProjectHeading,
  type ProjectHeadingProps,
} from '../project-heading/project-heading';
import { SessionRow, type SessionRowProps } from '../session-row/session-row';
import { rowClassName, rowFade } from './sessions-list-row-motion';

export function NoSessionsYet(): React.JSX.Element {
  return (
    <Text role="secondary" className="pb-1 pl-8.5 pr-1">
      No Sessions yet.
    </Text>
  );
}

export type SessionListRowProps = Pick<
  SessionRowProps,
  | 'session'
  | 'logo'
  | 'selected'
  | 'trailing'
  | 'layout'
  | 'onSelect'
  | 'onRename'
  | 'onArchive'
> & {
  // Fades the row in as it mounts.
  animate?: boolean;
  // Fades the row out before its Project collapses.
  closing?: boolean;
};

// Each row is held in a container of its own, so the space between rows is the container's: Regular rows sit 8 apart; Compact rows sit 2 apart wide, and a phone's grouped rows space themselves.
export const SessionListRow = memo(function SessionListRow({
  animate,
  closing,
  ...props
}: SessionListRowProps) {
  return (
    <Animated.View
      testID="session-row-surface"
      {...rowFade(animate)}
      className={rowClassName(closing)}
    >
      <SessionRow {...props} />
    </Animated.View>
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
