import type * as React from 'react';
import { ProjectListDetail } from '../project-list-detail';

export interface ProjectDetailScreenProps {
  name: string;
}

export function ProjectDetailScreen({
  name,
}: ProjectDetailScreenProps): React.JSX.Element {
  return <ProjectListDetail name={name} />;
}
