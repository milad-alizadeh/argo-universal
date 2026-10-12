import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { SettingsPage } from '#lib/product/settings-page';
import { FieldGroup } from '#primitives/field-group';
import { FieldRow } from '#primitives/field-row';
import { FieldSection } from '#primitives/field-section';
import { ListItem } from '#primitives/list-item';
import { Text } from '#primitives/text';
import { Button } from '../../../lib/generic/primitives/button';
import { SelectMenu } from '../../../lib/generic/primitives/select-menu';
import { Switch } from '../../../lib/generic/primitives/switch';
import { useWide } from '../../../lib/generic/use-wide';
import { homePath } from '../state/home-path';

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
type ProjectProps = { project: ProjectInfo };
type SectionsProps = ProjectProps & Pick<ProjectDetailViewProps, 'otherDevice'>;

// One Project: its folder, where its new Sessions start, and Remove.
export function ProjectDetailView(
  props: ProjectDetailViewProps,
): React.JSX.Element {
  return (
    <View className="flex-1 bg-sidebar wide:bg-transparent">
      <PhoneTitle title={props.name} />
      <SettingsPage
        title={props.name}
        caption={props.caption}
        onBack={props.onBack}
      >
        <ProjectBody {...props} />
      </SettingsPage>
    </View>
  );
}

function PhoneTitle({ title }: { title: string }): React.JSX.Element | null {
  if (useWide()) return null;
  return <ScreenHeader title={title} />;
}

function ProjectBody({
  project,
  name,
  otherDevice,
}: Pick<
  ProjectDetailViewProps,
  'project' | 'name' | 'otherDevice'
>): React.JSX.Element {
  if (project.status === 'loaded')
    return (
      <ProjectSections project={project.project} otherDevice={otherDevice} />
    );
  return (
    <FieldGroup>
      <FieldSection>
        {project.status === 'loading' ? (
          <ListItem title="Loading the Project…" loading />
        ) : (
          <ListItem title={`The Server has no Project named ${name}.`} />
        )}
      </FieldSection>
    </FieldGroup>
  );
}

function ProjectSections({
  project,
  otherDevice,
}: SectionsProps): React.JSX.Element {
  return (
    <FieldGroup>
      <FieldSection title="Folder">
        {otherDevice ? <ListItem title="Device" value={otherDevice} /> : null}
        <ListItem icon="folder" title={homePath(project.path)} code />
      </FieldSection>
      <NewSessionsSection project={project} />
      <RemoveProject />
    </FieldGroup>
  );
}

const checkoutOptions = [
  { value: 'worktree', label: 'New worktree' },
  { value: 'main', label: 'Local' },
] as const;
const newSessionsFooter =
  "A new worktree keeps each Session's files apart. The main checkout shares one folder. New worktrees branch from the base branch.";

// Where the Project's next Session starts, as the last New Session chose; the Server cannot change it from here yet.
function NewSessionsSection({ project }: ProjectProps): React.JSX.Element {
  const choice = project.checkoutChoice;
  return (
    <FieldSection title="New Sessions" footer={newSessionsFooter}>
      <ListItem
        title="Start in"
        accessory={
          <SelectMenu
            variant="plain"
            accessibilityLabel="Start in"
            value={choice.type}
            options={checkoutOptions}
            onValueChange={ignoreChoice}
            disabled
          />
        }
      />
      {choice.type === 'worktree' ? (
        <ListItem
          title="Base branch"
          accessory={
            <SelectMenu
              variant="plain"
              accessibilityLabel="Base branch"
              value={choice.baseBranch}
              options={[{ value: choice.baseBranch, label: choice.baseBranch }]}
              onValueChange={ignoreChoice}
              code
              disabled
            />
          }
        />
      ) : null}
      <ListItem
        title="Delete the worktree on archive"
        accessory={<ArchiveSwitch />}
      />
    </FieldSection>
  );
}

function ignoreChoice(): void {}

// Archiving keeps a Session's worktree today, and the Server has no setting to change that yet.
function ArchiveSwitch(): React.JSX.Element {
  return (
    <Switch
      accessibilityLabel="Delete the worktree on archive"
      checked={false}
      onCheckedChange={ignoreChoice}
      disabled
      aria-disabled
    />
  );
}

// A destructive button with no card around it, in a row the native list sizes, and what removing does: small on wide windows, full width on a phone. The Server cannot remove a Project yet.
function RemoveProject(): React.JSX.Element {
  return (
    <FieldRow>
      <View className="items-stretch gap-2 wide:items-start">
        <Button
          size="sm"
          fullWidth="narrow"
          variant="outline"
          role="destructive"
          label="Remove Project"
          disabled
        />
        <Text role="secondary" className="px-4 wide:px-0">
          Argo forgets this Project and archives its Sessions. The folder and
          its files stay.
        </Text>
      </View>
    </FieldRow>
  );
}
