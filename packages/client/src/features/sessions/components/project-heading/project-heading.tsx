import { Action } from '@repo/kit/primitives/actions/action';
import { Icon } from '@repo/kit/primitives/content/icon';
import { ListSectionHeader } from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import { memo } from 'react';
import { Platform } from 'react-native';

export interface ProjectHeadingProps {
  name: string;
  collapsed: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  onProjectSettings?: () => void;
}

function FolderIcon({ collapsed }: { collapsed: boolean }): React.JSX.Element {
  return <Icon name={collapsed ? 'folder' : 'folder-open'} />;
}

// Desktop and web draw the heading as Paper's sidebar section (Paper "SessionsList").
const sidebarHeading = Platform.OS === 'web';

function newSession(onAdd?: () => void): React.ReactNode {
  return (
    onAdd && (
      <Action
        key="new-session"
        label="New Session"
        icon="new-session"
        onPress={onAdd}
      />
    )
  );
}

function projectSettings(onProjectSettings?: () => void): React.ReactNode {
  return (
    onProjectSettings && (
      <Action
        key="project-settings"
        label="Project settings"
        icon="settings"
        onPress={onProjectSettings}
      />
    )
  );
}

// New Session, then Project settings, each only when the list offers it.
const projectActions = (props: ProjectHeadingProps): React.ReactNode => [
  newSession(props.onAdd),
  projectSettings(props.onProjectSettings),
];

// The Project's Sessions group: an open or closed folder for its state, its name, then its Actions, buttons on a wide window and a long press below it.
export const ProjectHeading = memo(function ProjectHeading(
  props: ProjectHeadingProps,
): React.JSX.Element {
  return (
    <ListSectionHeader
      title={props.name}
      leading={<FolderIcon collapsed={props.collapsed} />}
      actions={projectActions(props)}
      isExpanded={!props.collapsed}
      sidebar={sidebarHeading}
      onExpandedChange={props.onToggle}
    />
  );
});
