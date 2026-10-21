import type { ProjectInfo } from '@repo/contracts';
import { ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type * as React from 'react';

const checkoutOptions = [
  { value: 'worktree', label: 'New worktree' },
  { value: 'main', label: 'Local' },
] as const;

// Paper "Settings · Porcelain": each row says what it changes.
const descriptions = {
  startIn: "A new worktree keeps each Session's files apart",
  baseBranch: 'New worktrees branch from it',
  archive: 'Archiving a Session removes its folder; the branch stays',
};

type ProjectProps = { project: ProjectInfo };

type ChoiceProps = { choice: ProjectInfo['checkoutChoice'] };

type PickerRowProps = Pick<
  React.ComponentProps<typeof ListItem.Picker>,
  'value' | 'options'
> & {
  label: string;
  description: string;
};

// Where the Project's next Session starts, as the last New Session chose; the Server cannot change it from here yet.
export function NewSessionsSection({
  project,
}: ProjectProps): React.JSX.Element {
  return (
    <ListSection title="New Sessions">
      <StartInRow choice={project.checkoutChoice} />
      <BaseBranchRow choice={project.checkoutChoice} />
      <ArchiveRow />
    </ListSection>
  );
}

// A Picker the Server cannot change yet, in a row titled with its label.
function PickerRow(props: PickerRowProps): React.JSX.Element {
  return (
    <ListItem.Picker
      title={props.label}
      value={props.value}
      options={props.options}
      disabled
      onValueChange={ignoreChoice}
      description={props.description}
    />
  );
}

function StartInRow({ choice }: ChoiceProps): React.JSX.Element {
  return (
    <PickerRow
      label="Start in"
      description={descriptions.startIn}
      value={choice.type}
      options={checkoutOptions}
    />
  );
}

function BaseBranchRow({ choice }: ChoiceProps): React.JSX.Element | null {
  if (choice.type !== 'worktree') return null;

  return (
    <PickerRow
      label="Base branch"
      description={descriptions.baseBranch}
      value={choice.baseBranch}
      options={[{ value: choice.baseBranch, label: choice.baseBranch }]}
    />
  );
}

function ignoreChoice(): void {}

function ArchiveRow(): React.JSX.Element {
  return (
    <ListItem.Toggle
      title="Delete the worktree on archive"
      description={descriptions.archive}
      value={false}
      disabled
      onValueChange={ignoreChoice}
    />
  );
}
