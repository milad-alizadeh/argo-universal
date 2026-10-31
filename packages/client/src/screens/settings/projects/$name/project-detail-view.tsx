import type { ProjectInfo } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { homePath, SettingsLoading } from '#features/settings';
import {
  pluginSlotSections,
  type PluginSectionFrame,
  type PluginSlotContribution,
} from '../../../../lib/product/plugin-registry';
import {
  accountsSection,
  type ProjectAccountsProps,
} from './project-detail-accounts';
import { newSessionsSections } from './project-detail-new-sessions';
import { removeSection } from './project-detail-remove';

export type ProjectLoad =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'loaded'; project: ProjectInfo };

export interface ProjectDetailViewProps {
  // The name the page was opened with; the title until the Project loads.
  name: string;
  project: ProjectLoad;
  // The Device the Project is on, given only when that is another Device; pairing does not exist yet, so the screen passes none.
  otherDevice?: string;
  onBack?: () => void;
  // What Plugins add to this Project (the `argo/project/details/v1` Slot), one section each between Accounts and New Sessions.
  pluginContributions?: readonly PluginSlotContribution[];
  // The Accounts this Project chose per host, drawn below Folder; omitted until the Server has answered.
  accounts?: ProjectAccountsProps;
}

type BodyProps = Pick<
  ProjectDetailViewProps,
  'project' | 'name' | 'otherDevice' | 'pluginContributions' | 'accounts'
>;

type SectionsProps = Pick<
  ProjectDetailViewProps,
  'otherDevice' | 'pluginContributions' | 'accounts'
> & {
  project: ProjectInfo;
};

// One Project: its folder, its Accounts, what Plugins add, where its new Sessions start, and Remove.
export function ProjectDetailView(
  props: ProjectDetailViewProps,
): React.JSX.Element {
  return (
    <Screen title={props.name} onBack={props.onBack}>
      <ProjectBody {...props} />
    </Screen>
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

const UnloadedProject = ({ status, name }: UnloadedProps): React.JSX.Element =>
  status === 'loading' ? (
    <SettingsLoading label="Loading the Project…" />
  ) : (
    <FieldGroup>
      <FieldGroup.Section>
        <FieldGroup.Value
          title={`The Server has no Project named ${name}.`}
          value=""
        />
      </FieldGroup.Section>
    </FieldGroup>
  );

// FieldGroup finds its sections by element type, so each is an element built here, not a component.
function ProjectSections(props: SectionsProps): React.JSX.Element {
  const { project, otherDevice, pluginContributions = [], accounts } = props;

  return (
    <FieldGroup>
      {folderSection(project, otherDevice)}
      {accountsSection(accounts)}
      {pluginSlotSections(pluginContributions, pluginSection)}
      {newSessionsSections(project)}
      {removeSection()}
    </FieldGroup>
  );
}

// One Plugin's tree is the one row of a section of its own, titled with the Plugin's name.
const pluginSection: PluginSectionFrame = ({ key, title, children }) => (
  <FieldGroup.Section key={key} title={title}>
    {children}
  </FieldGroup.Section>
);

function folderSection(
  project: ProjectInfo,
  otherDevice: string | undefined,
): React.JSX.Element {
  return (
    <FieldGroup.Section title="Folder">
      {otherDevice ? (
        <FieldGroup.Value title="Device" value={otherDevice} />
      ) : null}
      <FieldGroup.Value title="Path" value={homePath(project.path)} />
    </FieldGroup.Section>
  );
}
