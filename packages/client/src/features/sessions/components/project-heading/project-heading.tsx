import type * as React from 'react';
import { memo } from 'react';
import { Icon } from '#primitives/content/icon';
import { ListSectionHeader } from '#primitives/lists/list';
import type { ContextMenuTriggerProps } from '#primitives/overlays/menu';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { ProjectActions } from './project-heading-actions';
import { ProjectHeadingMenu } from './project-heading-menu';

export interface ProjectHeadingProps {
  name: string;
  collapsed: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  addLabel?: string;
  onProjectSettings?: () => void;
}

type HeaderProps = ProjectHeadingProps &
  ContextMenuTriggerProps & { actions?: React.ReactNode };

function FolderIcon({ collapsed }: { collapsed: boolean }): React.JSX.Element {
  return <Icon role="body" name={collapsed ? 'folder' : 'folder-open'} />;
}

// The Project's Sessions group: an open or closed folder for its state, its name, then its actions.
function ProjectHeader(props: HeaderProps): React.JSX.Element {
  return (
    <ListSectionHeader
      title={props.name}
      leading={<FolderIcon collapsed={props.collapsed} />}
      trailing={props.actions}
      isExpanded={!props.collapsed}
      onExpandedChange={props.onToggle}
      onLongPress={props.onLongPress}
    />
  );
}

// A wide window's header draws + and ⋯; below it, a long press opens the same actions, and the header lifts on iOS.
export const ProjectHeading = memo(function ProjectHeading(
  props: ProjectHeadingProps,
): React.JSX.Element {
  const compact = (
    <ProjectHeadingMenu {...props}>
      <ProjectHeader {...props} />
    </ProjectHeadingMenu>
  );

  const wide = (
    <ProjectHeader {...props} actions={<ProjectActions {...props} />} />
  );

  return <SizeClass compact={compact} wide={wide} />;
});
