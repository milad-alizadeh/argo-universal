import { ScreenBesideList } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { ProjectDetailPane } from './project-detail-pane';

export interface ProjectDetailScreenProps {
  name: string;
  // Selects the Project by its stable id when given; two Projects can share a display name.
  projectId?: string;
}

export function ProjectDetailScreen({
  name,
  projectId,
}: ProjectDetailScreenProps): React.JSX.Element {
  return (
    <ScreenBesideList value={false}>
      <ProjectDetailPane name={name} projectId={projectId} />
    </ScreenBesideList>
  );
}
