import { ListTreeContext, type TreeRow } from '@repo/kit/list-tree';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type * as React from 'react';
import { memo, useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  ProjectHeading,
  type ProjectHeadingProps,
} from '../project-heading/project-heading';
import { SessionRow, type SessionRowProps } from '../session-row/session-row';
import { useDrawnRow } from './sessions-list-drawn-rows';
import {
  emptyRowClassName,
  headingClassName,
  rowFade,
  useRowClassName,
} from './sessions-list-row-motion';

export function NoSessionsYet(): React.JSX.Element {
  return (
    <View className={emptyRowClassName}>
      <ListItem title="No Sessions yet." tone="muted" multiline />
    </View>
  );
}

export type SessionListRowProps = Pick<
  SessionRowProps,
  | 'session'
  | 'logo'
  | 'selected'
  | 'age'
  | 'layout'
  | 'plugins'
  | 'onOpenPluginPage'
  | 'onSelect'
  | 'onRename'
  | 'onArchive'
> & {
  tree?: TreeRow;
  // Fades the row in as it mounts.
  animate?: boolean;
  // Fades the row out before its Project collapses.
  closing?: boolean;
};

const rowSurface = (
  animate: boolean | undefined,
): ReturnType<typeof rowFade> & { testID: string } => ({
  testID: 'session-row-surface',
  ...rowFade(animate),
});

// Each row is held in a container of its own, so the space between rows is the container's: web rows sit 2 apart, flat; a phone's cards and grouped rows space themselves.
export const SessionListRow = memo(function SessionListRow({
  animate,
  closing,
  ...props
}: SessionListRowProps) {
  useDrawnRow(props.session.sessionId);

  return (
    <Animated.View
      {...rowSurface(animate)}
      className={useRowClassName(closing)}
    >
      <SessionTreeRow {...props} />
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
    <View className={headingClassName(props.collapsed)}>
      <ProjectHeading
        name={props.name}
        collapsed={props.collapsed}
        {...actions}
      />
    </View>
  );
});

function SessionTreeRow({
  tree,
  ...props
}: SessionListRowProps): React.JSX.Element {
  return (
    <ListTreeContext value={tree ?? null}>
      <SessionRow {...props} />
    </ListTreeContext>
  );
}
