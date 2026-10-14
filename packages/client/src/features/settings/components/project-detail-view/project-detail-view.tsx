import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { SettingsPage } from '#lib/product/settings-page';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { homePath } from '../../state/home-path';
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
}

type BodyProps = Pick<
  ProjectDetailViewProps,
  'project' | 'name' | 'otherDevice'
>;

type SectionsProps = Pick<ProjectDetailViewProps, 'otherDevice'> & {
  project: ProjectInfo;
};

// One Project: its folder, where its new Sessions start, and Remove.
export function ProjectDetailView(
  props: ProjectDetailViewProps,
): React.JSX.Element {
  return (
    <View className="flex-1 bg-content wide:bg-transparent">
      <PhoneTitle title={props.name} />
      <ProjectPage {...props} />
    </View>
  );
}

function PhoneTitle({ title }: { title: string }): React.JSX.Element | null {
  if (useWide()) return null;

  return <ScreenHeader title={title} />;
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
  otherDevice,
}: BodyProps): React.JSX.Element {
  if (project.status !== 'loaded')
    return <UnloadedProject status={project.status} name={name} />;

  return (
    <ProjectSections project={project.project} otherDevice={otherDevice} />
  );
}

type UnloadedProps = { status: 'loading' | 'missing'; name: string };

function UnloadedProject(props: UnloadedProps): React.JSX.Element {
  return (
    <GroupedList>
      <GroupedListSection>
        <UnloadedRow {...props} />
      </GroupedListSection>
    </GroupedList>
  );
}

function UnloadedRow({ status, name }: UnloadedProps): React.JSX.Element {
  if (status === 'loading')
    return <GroupedListItem title="Loading the Project…" loading />;

  return <GroupedListItem title={`The Server has no Project named ${name}.`} />;
}

function ProjectSections({
  project,
  otherDevice,
}: SectionsProps): React.JSX.Element {
  return (
    <GroupedList>
      <GroupedListSection title="Folder">
        {deviceRow(otherDevice)}
        <GroupedListItem icon="folder" title={homePath(project.path)} />
      </GroupedListSection>
      <NewSessionsSection project={project} />
      <RemoveProject />
    </GroupedList>
  );
}

const deviceRow = (device?: string): React.JSX.Element | null =>
  device ? <GroupedListItem title="Device" value={device} /> : null;
