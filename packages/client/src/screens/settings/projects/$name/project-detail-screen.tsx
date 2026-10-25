import { ScreenBesideList } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { ProjectDetailPane } from './project-detail-pane';

export interface ProjectDetailScreenProps {
  name: string;
}

export function ProjectDetailScreen({
  name,
}: ProjectDetailScreenProps): React.JSX.Element {
  return (
    <ScreenBesideList value={false}>
      <ProjectDetailPane name={name} />
    </ScreenBesideList>
  );
}
