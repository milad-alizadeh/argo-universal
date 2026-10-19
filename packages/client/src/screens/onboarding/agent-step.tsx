import type * as React from 'react';
import { View } from 'react-native';
import { agentRows } from '#features/agents';
import type { StepMark } from '#features/setup';
import { List } from '#primitives/lists/list';
import { RegistryState } from '../settings/agents/catalog-states';
import type { OnboardingViewProps } from './onboarding-props';
import { SetupStep } from './setup-step';

export function AgentStepView(
  props: OnboardingViewProps & { mark: StepMark },
): React.JSX.Element {
  return (
    <SetupStep
      number={1}
      mark={props.mark}
      title="Agent Setup"
      caption="Install your favorite Agents and start your first Session."
      footer={<FeaturedAgents {...props} />}
    />
  );
}

// The Agents page's Agent card, so a featured Agent installs or is removed as it is there.
function FeaturedAgents(props: OnboardingViewProps): React.JSX.Element {
  const { rows, ...load } = props.featured;

  if (load.status !== 'loaded')
    return <RegistryState load={load} onRetry={props.onRetry} />;

  return (
    <View className="w-full">
      <List appearance="cards" fit>
        {agentRows(rows, {
          onInstall: props.onInstallAgent,
          onRemove: props.onRemoveAgent,
        })}
      </List>
    </View>
  );
}
