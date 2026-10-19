import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { homePath } from '#features/settings';
import { RowDrawingContext } from '#lib/generic/row-drawing-context';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Metadata } from '#primitives/scaffolds/metadata';
import { Page } from '#primitives/scaffolds/page';
import { Spinner } from '#primitives/status/spinner';
import { NewSessionsSection } from './project-detail-new-sessions';
import { RemoveProject } from './project-detail-remove';

export type ProjectLoad =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'loaded'; project: ProjectInfo };

export interface ProjectDetailViewProps {
  // The name the page was opened with; the title until the Project loads.
  name: string;
  caption?: string;
  project: ProjectLoad;
  // The Device the Project is on, given only when that is another Device; pairing does not exist yet, so the screen passes none.
  otherDevice?: string;
  onBack?: () => void;
  // What Plugins add to this Project (the `argo/project/details/v1` Slot), drawn after Folder.
  renderPluginSlot?: (project: ProjectInfo) => React.ReactNode;
}

type BodyProps = Pick<
  ProjectDetailViewProps,
  'project' | 'name' | 'otherDevice' | 'renderPluginSlot'
>;

type SectionsProps = Pick<
  ProjectDetailViewProps,
  'otherDevice' | 'renderPluginSlot'
> & {
  project: ProjectInfo;
};

// One Project: its folder, what Plugins add, where its new Sessions start, and Remove.
export function ProjectDetailView(
  props: ProjectDetailViewProps,
): React.JSX.Element {
  return (
    <Page title={props.name} caption={props.caption} onBack={props.onBack}>
      <RowDrawingContext value="content">
        <ProjectBody {...props} />
      </RowDrawingContext>
    </Page>
  );
}

function ProjectBody({
  project,
  name,
  ...sections
}: BodyProps): React.JSX.Element {
  if (project.status !== 'loaded')
    return <UnloadedProject status={project.status} name={name} />;

  return <ProjectSections project={project.project} {...sections} />;
}

type UnloadedProps = { status: 'loading' | 'missing'; name: string };

function UnloadedProject(props: UnloadedProps): React.JSX.Element {
  return (
    <List appearance="grouped">
      <ListSection>
        <UnloadedRow {...props} />
      </ListSection>
    </List>
  );
}

function UnloadedRow({ status, name }: UnloadedProps): React.JSX.Element {
  if (status === 'loading')
    return (
      <ListItem
        title="Loading the Project…"
        leading={<Spinner accessibilityLabel="Loading" />}
      />
    );

  return <ListItem title={`The Server has no Project named ${name}.`} />;
}

function ProjectSections({
  project,
  otherDevice,
  renderPluginSlot,
}: SectionsProps): React.JSX.Element {
  return (
    <List appearance="grouped">
      <FolderSection project={project} otherDevice={otherDevice} />
      {renderPluginSlot?.(project)}
      <NewSessionsSection project={project} />
      <RemoveProject />
    </List>
  );
}

function FolderSection({
  project,
  otherDevice,
}: Pick<SectionsProps, 'project' | 'otherDevice'>): React.JSX.Element {
  const path = homePath(project.path);

  return (
    <Metadata title="Folder">
      {otherDevice ? (
        <Metadata.Label title="Device" text={otherDevice} />
      ) : null}
      <Metadata.Label title="Path" text={path} accessibilityLabel={path} />
    </Metadata>
  );
}
