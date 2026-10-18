import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { homePath } from '#features/settings';
import { SettingsPage } from '#lib/product/settings-page';
import { ActionShortcutScope } from '#primitives/actions/action-list';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Metadata, type MetadataProps } from '#primitives/scaffolds/metadata';
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
    <ActionShortcutScope>
      <View className="flex-1 bg-content wide:bg-transparent">
        <ProjectPage {...props} />
      </View>
    </ActionShortcutScope>
  );
}

function ProjectPage(props: ProjectDetailViewProps): React.JSX.Element {
  return (
    <SettingsPage
      title={props.name}
      caption={props.caption}
      onBack={props.onBack}
    >
      <ProjectBody {...props} />
    </SettingsPage>
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
  const rows: MetadataProps['rows'] = [];
  if (otherDevice)
    rows.push({ title: 'Device', value: { kind: 'text', text: otherDevice } });
  const path = homePath(project.path);
  rows.push({
    title: 'Path',
    value: { kind: 'text', text: path },
    accessibilityLabel: path,
  });

  return <Metadata title="Folder" rows={rows} />;
}
