import type { ProjectInfo } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';

const checkoutOptions = [
  { value: 'worktree', label: 'New worktree' },
  { value: 'main', label: 'Local' },
] as const;

// One footer for the section, as iOS Settings explains a group of rows; drawn on every platform.
const footer =
  "A new worktree keeps each Session's files apart and branches from the base branch. Archiving a Session removes its folder; the branch stays.";

type ChoiceProps = { choice: ProjectInfo['checkoutChoice'] };

// Where the Project's next Session starts, as the last New Session chose; the Server cannot change it from here yet.
export const newSessionsSection = (project: ProjectInfo): React.JSX.Element => (
  <FieldGroup.Section title="New Sessions" footer={footer}>
    <FieldGroup.Picker
      title="Start in"
      value={project.checkoutChoice.type}
      options={checkoutOptions}
      disabled
      onValueChange={ignoreChoice}
    />
    <BaseBranchRow choice={project.checkoutChoice} />
    <ArchiveRow />
  </FieldGroup.Section>
);

const ArchiveRow = (): React.JSX.Element => (
  <FieldGroup.Toggle
    title="Delete the worktree on archive"
    value={false}
    disabled
    onValueChange={ignoreChoice}
  />
);

function BaseBranchRow({ choice }: ChoiceProps): React.JSX.Element | null {
  if (choice.type !== 'worktree') return null;

  return (
    <FieldGroup.Picker
      title="Base branch"
      value={choice.baseBranch}
      options={[{ value: choice.baseBranch, label: choice.baseBranch }]}
      disabled
      onValueChange={ignoreChoice}
    />
  );
}

function ignoreChoice(): void {}
