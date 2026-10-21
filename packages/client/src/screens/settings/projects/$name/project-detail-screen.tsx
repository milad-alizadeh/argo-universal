import { PageBesideList } from '@repo/kit/primitives/scaffolds/page';
import type * as React from 'react';
import { ProjectDetailPane } from './project-detail-pane';

export interface ProjectDetailScreenProps {
  name: string;
}

export function ProjectDetailScreen({
  name,
}: ProjectDetailScreenProps): React.JSX.Element {
  return (
    <PageBesideList value={false}>
      <ProjectDetailPane name={name} />
    </PageBesideList>
  );
}
