import type {
  ProjectCheckoutChoice,
  ProjectInfo,
  ProjectsBranchesOutput,
} from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';

const checkoutOptions = [
  { value: 'worktree', label: 'New worktree' },
  { value: 'main', label: 'Local' },
] as const;

/*
 * Each row says what it changes, as its own section's footer (a FieldGroup row has no description of its own).
 * FieldGroup finds its sections by element type, so these are elements built here, the first one titled.
 */
const descriptions = {
  startIn: "A new worktree keeps each Session's files apart",
  baseBranch: 'New worktrees branch from it',
  archiveRemoves: 'Archiving a Session removes its folder; the branch stays',
  archiveKeeps: 'Archiving a Session keeps its folder and its branch',
};

export interface ProjectNewSessionsControls {
  // The Project's branches; omitted until the Server has answered.
  branches?: ProjectsBranchesOutput;
  onCheckoutChoiceChange: (choice: ProjectCheckoutChoice) => void;
  onDeleteWorktreeOnArchiveChange: (value: boolean) => void;
}

// Undefined offers no change: a Project whose folder is gone, or a page that cannot save one.
type Controls = ProjectNewSessionsControls | undefined;

type Choice = ProjectInfo['checkoutChoice'];

// Where the Project's next Session starts, as the last New Session or this page chose.
export const newSessionsSections = (
  project: ProjectInfo,
  controls: Controls,
): React.JSX.Element => {
  const editing = project.folderExists ? controls : undefined;

  return (
    <>
      {startInSection(project.checkoutChoice, editing)}
      {baseBranchSection(project.checkoutChoice, editing)}
      {archiveSection(project.deleteWorktreeOnArchive, editing)}
    </>
  );
};

// A new worktree branches from the current branch, or from the first there is on a detached HEAD.
const firstBaseBranch = ({
  currentBranch,
  branches,
}: ProjectsBranchesOutput): string | undefined => currentBranch ?? branches[0];

const nextBaseBranch = (
  choice: Choice,
  branches: ProjectsBranchesOutput | undefined,
): string | undefined => {
  if (choice.type === 'worktree') return choice.baseBranch;

  return branches && firstBaseBranch(branches);
};

const chosenCheckout = (
  type: string,
  baseBranch: string | undefined,
): ProjectCheckoutChoice =>
  type === 'worktree' && baseBranch !== undefined
    ? { type, baseBranch }
    : { type: 'main' };

const StartInPicker = ({ choice, controls }: RowProps): React.JSX.Element => {
  const baseBranch = nextBaseBranch(choice, controls?.branches);

  return (
    <FieldGroup.Picker
      title="Start in"
      value={choice.type}
      options={checkoutOptions}
      presentation="menu"
      disabled={!controls || baseBranch === undefined}
      onValueChange={(type) =>
        controls?.onCheckoutChoiceChange(chosenCheckout(type, baseBranch))
      }
    />
  );
};

type RowProps = { choice: Choice; controls: Controls };

const startInSection = (
  choice: Choice,
  controls: Controls,
): React.JSX.Element => (
  <FieldGroup.Section title="New Sessions" footer={descriptions.startIn}>
    <StartInPicker choice={choice} controls={controls} />
  </FieldGroup.Section>
);

const archiveSection = (
  value: boolean,
  controls: Controls,
): React.JSX.Element => (
  <FieldGroup.Section
    footer={value ? descriptions.archiveRemoves : descriptions.archiveKeeps}
  >
    <FieldGroup.Toggle
      title="Delete the worktree on archive"
      value={value}
      disabled={!controls}
      onValueChange={(next) => controls?.onDeleteWorktreeOnArchiveChange(next)}
    />
  </FieldGroup.Section>
);

const baseBranchSection = (
  choice: Choice,
  controls: Controls,
): React.JSX.Element | null =>
  choice.type === 'worktree' ? (
    <FieldGroup.Section footer={descriptions.baseBranch}>
      <BaseBranchPicker baseBranch={choice.baseBranch} controls={controls} />
    </FieldGroup.Section>
  ) : null;

// A chosen branch that has since been deleted stays listed, so the row still says what is set.
const branchOptions = (
  baseBranch: string,
  listed: ProjectsBranchesOutput | undefined,
): { value: string; label: string }[] =>
  [...new Set([baseBranch, ...(listed?.branches ?? [])])].map((branch) => ({
    value: branch,
    label: branch,
  }));

type BaseBranchProps = { baseBranch: string; controls: Controls };

const BaseBranchPicker = ({
  baseBranch,
  controls,
}: BaseBranchProps): React.JSX.Element => (
  <FieldGroup.Picker
    title="Base branch"
    value={baseBranch}
    options={branchOptions(baseBranch, controls?.branches)}
    presentation="menu"
    disabled={!controls?.branches}
    onValueChange={(branch) =>
      controls?.onCheckoutChoiceChange({ type: 'worktree', baseBranch: branch })
    }
  />
);
