import type * as React from 'react';
import { Button } from '../../../../lib/generic/primitives/buttons/button/button';
import type { AgentStep, StepMark } from '../../state/onboarding';
import type { OnboardingViewProps } from './onboarding-props';
import { SetupStep, type SetupStepProps } from './setup-step';

export type AgentStepViewProps = Pick<
  OnboardingViewProps,
  'agent' | 'onChangeAgent' | 'onCheckAgentAgain'
> & { mark: StepMark };

type StepParts = Pick<SetupStepProps, 'caption' | 'action'>;

const notFoundCaption =
  'No coding Agent found on this computer. Install one from the ACP Registry and sign in, then check again.';

const doneParts = (agentName: string, onChange: () => void): StepParts => ({
  caption: `${agentName}, signed in with your subscription.`,
  action: (
    <Button label="Change" variant="ghost" size="sm" onPress={onChange} />
  ),
});

const notFoundParts = (
  checking: boolean,
  onCheckAgain: () => void,
): StepParts => ({
  caption: notFoundCaption,
  action: (
    <Button
      label="Check again"
      size="sm"
      loading={checking}
      onPress={onCheckAgain}
    />
  ),
});

const agentParts = (agent: AgentStep, props: AgentStepViewProps): StepParts =>
  agent.status === 'done'
    ? doneParts(agent.agentName, props.onChangeAgent)
    : notFoundParts(agent.checking, props.onCheckAgentAgain);

// Step 1, whole in itself: Spec 0013 replaces it with Add an Agent.
export function AgentStepView(props: AgentStepViewProps): React.JSX.Element {
  return (
    <SetupStep
      number={1}
      mark={props.mark}
      title="Sign in to an Agent"
      {...agentParts(props.agent, props)}
    />
  );
}
