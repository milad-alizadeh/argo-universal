import type * as React from 'react';
import { View } from 'react-native';
import { RegistryIcon } from '#features/agents';
import type { StepMark } from '#features/setup';
import { Button } from '#primitives/buttons/button';
import { SelectedCheck } from '#primitives/display/selected-check';
import { Text } from '#primitives/display/text';
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
      footer={<AgentTiles {...props} />}
    />
  );
}

function AgentTiles(props: OnboardingViewProps): React.JSX.Element {
  if (props.catalog.status !== 'loaded')
    return (
      <RegistryState status={props.catalog.status} onRetry={props.onRetry} />
    );

  return (
    <View className="w-full flex-row flex-wrap gap-3">
      {props.featured.map((entry) => tile(entry, props))}
    </View>
  );
}

type TileProps = {
  entry: OnboardingViewProps['featured'][number];
  installed: boolean;
  onInstall: (id: string) => void;
};

function AgentTile(props: TileProps): React.JSX.Element {
  const { entry } = props;

  return (
    <View className="min-w-48 flex-1 flex-row items-center gap-2 rounded-control bg-card p-2">
      <RegistryIcon uri={entry.icon} agentName={entry.name} role="row" />
      <Text role="body">{entry.name}</Text>
      <TileAction {...props} />
    </View>
  );
}

function TileAction(props: TileProps): React.JSX.Element {
  return props.installed ? (
    <SelectedCheck />
  ) : (
    <Button
      label="Install"
      accessibilityLabel={`Install ${props.entry.name}`}
      size="sm"
      onPress={() => props.onInstall(props.entry.id)}
    />
  );
}

const tile = (
  entry: TileProps['entry'],
  props: OnboardingViewProps,
): React.JSX.Element => (
  <AgentTile
    key={entry.id}
    entry={entry}
    installed={props.installed.includes(entry.id)}
    onInstall={props.onInstallAgent}
  />
);
