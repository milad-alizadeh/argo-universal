import { Action } from '@repo/kit/primitives/actions/action';
import { Icon } from '@repo/kit/primitives/content/icon';
import { ListSectionHeader } from '@repo/kit/primitives/lists/list';
import type { IconName } from '@repo/kit/symbols/icon-names';
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

// Desktop and web draw the heading as a sidebar section.
const sidebarHeading = Platform.OS === 'web';

// An Action the list offers only when it has something to run.
function offered(
  label: string,
  icon: IconName,
  onPress?: () => void,
): React.ReactNode {
  return (
    onPress && (
      <Action key={label} label={label} icon={icon} onPress={onPress} />
    )
  );
}

// New Session, then Project settings, each only when the list offers it.
const projectActions = (props: ProjectHeadingProps): React.ReactNode => [
  offered('New Session', 'new-session', props.onAdd),
  offered('Project settings', 'settings', props.onProjectSettings),
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
