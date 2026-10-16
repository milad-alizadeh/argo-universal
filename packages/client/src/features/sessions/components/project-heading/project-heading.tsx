import type * as React from 'react';
import { memo } from 'react';
import { Pressable } from '#primitives/pressable';
import { ProjectActions } from './project-heading-actions';
import { ProjectToggle } from './project-heading-toggle';

export interface ProjectHeadingProps {
  name: string;
  collapsed: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  addLabel?: string;
  onProjectSettings?: () => void;
}

// The title takes the rows' hover tint on its own; the row's CSS group state reveals the actions, so no pointer event can leave them stuck.
const rowClassName =
  'group mb-0.5 min-h-10 web:h-10 wide:min-h-8 web:wide:h-8 flex-row items-center rounded-xl pr-1 web:wide:hover:bg-muted web:wide:focus-within:bg-muted';

export const ProjectHeading = memo(function ProjectHeading(
  props: ProjectHeadingProps,
): React.JSX.Element {
  return (
    <Pressable accessible={false} className={rowClassName}>
      <ProjectToggle {...props} />
      <ProjectActions {...props} />
    </Pressable>
  );
});
