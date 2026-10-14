import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { FieldSection } from '#primitives/fields/field-section';
import { Picker } from '#primitives/inputs/picker';
import type { PickerProps } from '#primitives/inputs/picker';
import { Switch } from '#primitives/inputs/switch';
import { ListItem } from '#primitives/lists/list-item';

const checkoutOptions = [
  { value: 'worktree', label: 'New worktree' },
  { value: 'main', label: 'Local' },
] as const;

const newSessionsFooter =
  "A new worktree keeps each Session's files apart. The main checkout shares one folder. New worktrees branch from the base branch.";

type ProjectProps = { project: ProjectInfo };

type ChoiceProps = { choice: ProjectInfo['checkoutChoice'] };

type PickerRowProps = Pick<PickerProps<string>, 'label' | 'value' | 'options'>;

// Where the Project's next Session starts, as the last New Session chose; the Server cannot change it from here yet.
export function NewSessionsSection({
  project,
}: ProjectProps): React.JSX.Element {
  return (
    <FieldSection title="New Sessions" footer={newSessionsFooter}>
      <StartInRow choice={project.checkoutChoice} />
      <BaseBranchRow choice={project.checkoutChoice} />
      <ArchiveRow />
    </FieldSection>
  );
}

// A Picker the Server cannot change yet, in a row titled with its label.
function PickerRow(props: PickerRowProps): React.JSX.Element {
  return (
    <ListItem
      title={props.label}
      accessory={
        <Picker
          appearance="row"
          {...props}
          onValueChange={ignoreChoice}
          disabled
        />
      }
    />
  );
}

function StartInRow({ choice }: ChoiceProps): React.JSX.Element {
  return (
    <PickerRow label="Start in" value={choice.type} options={checkoutOptions} />
  );
}

function BaseBranchRow({ choice }: ChoiceProps): React.JSX.Element | null {
  if (choice.type !== 'worktree') return null;

  return (
    <PickerRow
      label="Base branch"
      value={choice.baseBranch}
      options={[{ value: choice.baseBranch, label: choice.baseBranch }]}
    />
  );
}

function ignoreChoice(): void {}

function ArchiveRow(): React.JSX.Element {
  return (
    <ListItem
      title="Delete the worktree on archive"
      accessory={<ArchiveSwitch />}
    />
  );
}

// Archiving keeps a Session's worktree today, and the Server has no setting to change that yet.
function ArchiveSwitch(): React.JSX.Element {
  return (
    <Switch
      accessibilityLabel="Delete the worktree on archive"
      value={false}
      onValueChange={ignoreChoice}
      disabled
    />
  );
}
