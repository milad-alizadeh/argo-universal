import type { ProjectInfo } from '@repo/contracts';
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
  archive: 'Archiving a Session removes its folder; the branch stays',
};

type Choice = ProjectInfo['checkoutChoice'];

// Where the Project's next Session starts, as the last New Session chose; the Server cannot change it from here yet.
export const newSessionsSections = (
  project: ProjectInfo,
): React.JSX.Element => (
  <>
    {startInSection(project.checkoutChoice)}
    {baseBranchSection(project.checkoutChoice)}
    {archiveSection()}
  </>
);

const startInSection = (choice: Choice): React.JSX.Element => (
  <FieldGroup.Section title="New Sessions" footer={descriptions.startIn}>
    <FieldGroup.Picker
      title="Start in"
      value={choice.type}
      options={checkoutOptions}
      presentation="menu"
      disabled
      onValueChange={ignoreChoice}
    />
  </FieldGroup.Section>
);

const archiveSection = (): React.JSX.Element => (
  <FieldGroup.Section footer={descriptions.archive}>
    <FieldGroup.Toggle
      title="Delete the worktree on archive"
      value={true}
      disabled
      onValueChange={ignoreChoice}
    />
  </FieldGroup.Section>
);

const baseBranchSection = (choice: Choice): React.JSX.Element | null =>
  choice.type === 'worktree' ? (
    <FieldGroup.Section footer={descriptions.baseBranch}>
      <BaseBranchPicker baseBranch={choice.baseBranch} />
    </FieldGroup.Section>
  ) : null;

const BaseBranchPicker = ({
  baseBranch,
}: {
  baseBranch: string;
}): React.JSX.Element => (
  <FieldGroup.Picker
    title="Base branch"
    value={baseBranch}
    options={[{ value: baseBranch, label: baseBranch }]}
    presentation="menu"
    disabled
    onValueChange={ignoreChoice}
  />
);

function ignoreChoice(): void {}
