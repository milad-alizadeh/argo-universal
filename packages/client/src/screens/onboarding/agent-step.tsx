import type * as React from 'react';
import type { StepMark } from '#features/setup';
import type { OnboardingViewProps } from './onboarding-props';
import { SetupStep } from './setup-step';

// Step 1: Agents are installed on the Agents page, so the Registry is browsed in one place.
export function AgentStepView(
  props: Pick<OnboardingViewProps, 'onAddAgent'> & { mark: StepMark },
): React.JSX.Element {
  return (
    <SetupStep
      number={1}
      mark={props.mark}
      title="Agent Setup"
      caption="Install your favorite Agents and start your first Session."
      add={{ label: 'Add Agent', onPress: props.onAddAgent }}
    />
  );
}
