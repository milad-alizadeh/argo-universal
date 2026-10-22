import { Icon } from '@repo/kit/primitives/content/icon';
import { ListSectionHeader } from '@repo/kit/primitives/lists/list';
import type { ContextMenuTriggerProps } from '@repo/kit/primitives/overlays/menu';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { memo } from 'react';
import { Platform } from 'react-native';
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
  return <Icon size="sm" name={collapsed ? 'folder' : 'folder-open'} />;
}

// Desktop and web draw the heading as Paper's sidebar section (Paper "SessionsList").
const sidebarHeading = Platform.OS === 'web';

// The Project's Sessions group: an open or closed folder for its state, its name, then its actions.
function ProjectHeader(props: HeaderProps): React.JSX.Element {
  return (
    <ListSectionHeader
      title={props.name}
      leading={<FolderIcon collapsed={props.collapsed} />}
      trailing={props.actions}
      isExpanded={!props.collapsed}
      sidebar={sidebarHeading}
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
