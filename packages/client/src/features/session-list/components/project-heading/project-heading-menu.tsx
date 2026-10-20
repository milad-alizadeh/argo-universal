import type { ReactElement } from 'react';
import {
  ContextMenu,
  type ContextMenuItem,
  contextMenuGroup,
  type ContextMenuTriggerProps,
} from '#primitives/overlays/menu';
import type { ProjectHeadingProps } from './project-heading';

type ProjectHeadingMenuProps = ProjectHeadingProps & {
  children: ReactElement<ContextMenuTriggerProps>;
};

// Below a wide window, a long press opens New Session and the Project's settings under the Project's name; the heading lifts on iOS.
export function ProjectHeadingMenu(
  props: ProjectHeadingMenuProps,
): ReactElement {
  const groups = projectMenuGroups(props);

  if (groups.length === 0) return props.children;

  return (
    <ContextMenu groups={groups} title={props.name}>
      {props.children}
    </ContextMenu>
  );
}

// New Session, then Project settings, each only when the list offers it; a phone's system menu parts the two.
function projectMenuGroups(props: ProjectHeadingProps): ContextMenuItem[][] {
  return [
    contextMenuGroup(
      { label: 'New Session', icon: 'new-session' },
      props.onAdd,
    ),
    contextMenuGroup(
      { label: 'Project settings', icon: 'settings' },
      props.onProjectSettings,
    ),
  ].filter((group) => group.length > 0);
}
