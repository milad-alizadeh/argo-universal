import type * as React from 'react';
import { ListDetail } from '#primitives/scaffolds/list-detail';
import { EmptyState } from '#primitives/status/empty-state';
import {
  ProjectDetail,
  type ProjectDetailScreenProps,
} from './$name/project-detail-screen';
import { ProjectList } from './project-list-screen';

const noProject = (
  <EmptyState
    title="Select a Project"
    description="Choose a Project from the list."
  />
);

// The Projects list and the Project the route names: side by side on a wide window, one at a time under it.
function ProjectListDetail(props: { name?: string }): React.JSX.Element {
  return (
    <ListDetail
      list={<ProjectList selected={props.name} />}
      detail={
        props.name === undefined ? null : <ProjectDetail name={props.name} />
      }
      empty={noProject}
    />
  );
}

export function ProjectListScreen(): React.JSX.Element {
  return <ProjectListDetail />;
}

export function ProjectDetailScreen({
  name,
}: ProjectDetailScreenProps): React.JSX.Element {
  return <ProjectListDetail name={name} />;
}
