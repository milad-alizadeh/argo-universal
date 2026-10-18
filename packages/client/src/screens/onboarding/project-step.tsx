import type * as React from 'react';
import { type StepMark } from '#features/setup';
import { Button } from '#primitives/actions/button';
import type { OnboardingViewProps } from './onboarding-props';
import { SetupStep } from './setup-step';

// `onAddProject` is unset until the App can add a Project.
export type ProjectStepViewProps = Pick<OnboardingViewProps, 'onAddProject'> & {
  mark: StepMark;
};

const caption =
  'A git repository on your computer. Pick a local folder, clone one from GitHub, or start a new one.';

function AddProjectButton(props: ProjectStepViewProps): React.JSX.Element {
  const next = props.mark === 'next';

  return (
    <Button
      label="Add Project"
      icon={next ? 'add' : undefined}
      variant={next ? 'default' : 'outline'}
      size="sm"
      disabled={!props.onAddProject}
      onPress={props.onAddProject}
    />
  );
}

// Step 3: adding the first Project ends Onboarding, so it is never done here.
export function ProjectStepView(
  props: ProjectStepViewProps,
): React.JSX.Element {
  return (
    <SetupStep
      number={3}
      mark={props.mark}
      title="Add a Project"
      caption={caption}
      action={<AddProjectButton {...props} />}
    />
  );
}
