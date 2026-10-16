import type * as React from 'react';
import { memo } from 'react';
import { Pressable } from '#primitives/pressable';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
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

// The heading takes the rows' hover tint; the CSS group state drives it and the actions, so no pointer event can leave them stuck.
const rowClassName =
  'group min-h-10 web:h-10 wide:min-h-8 web:wide:h-8 flex-row items-center rounded-md pr-1 web:hover:bg-hover web:focus-within:bg-hover';

export const ProjectHeading = memo(function ProjectHeading(
  props: ProjectHeadingProps,
): React.JSX.Element {
  const wide = useWide();

  return (
    <Pressable accessible={false} className={rowClassName}>
      <ProjectToggle {...props} wide={wide} />
      <ProjectActions {...props} />
    </Pressable>
  );
});
