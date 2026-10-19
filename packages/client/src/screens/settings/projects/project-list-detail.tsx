import type * as React from 'react';
import { ListDetail } from '#primitives/scaffolds/list-detail';
import { EmptyState } from '#primitives/status/empty-state';
import { ProjectDetailPane } from './$name/project-detail-pane';
import { ProjectListPane } from './project-list-pane';

const noProject = (
  <EmptyState
    title="Select a Project"
    description="Choose a Project from the list."
  />
);

// The Projects list and the Project the route names: side by side on a wide window, one at a time under it.
export function ProjectListDetail(props: { name?: string }): React.JSX.Element {
  return (
    <ListDetail
      list={<ProjectListPane selected={props.name} />}
      detail={
        props.name === undefined ? null : (
          <ProjectDetailPane name={props.name} />
        )
      }
      empty={noProject}
    />
  );
}
