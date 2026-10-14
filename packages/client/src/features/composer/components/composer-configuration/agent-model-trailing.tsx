import type { SessionConfigSelectOption } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  currentEffort,
  selectedChoice,
  switches,
  choiceMetadata,
} from './configuration-values';

const fastModeConfigId = 'fast';

interface TrailingProps {
  configuration: ComposerConfigurationProps;
  wide: boolean;
}

export function AgentModelTrailing(props: TrailingProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-1.5">
      <EffortLabel {...props} />
      <FastModeIndicator configuration={props.configuration} />
      <AgentModelChevron wide={props.wide} />
    </View>
  );
}

function FastModeIndicator({
  configuration,
}: Pick<TrailingProps, 'configuration'>): React.JSX.Element | null {
  const fastOn = switches(configuration).some(
    (option) => option.configId === fastModeConfigId && option.currentValue,
  );

  return fastOn ? (
    <Icon role="control" name="fast-mode" filled testID="fast-mode-on" />
  ) : null;
}

function AgentModelChevron({
  wide,
}: {
  wide: boolean;
}): React.JSX.Element | null {
  return wide ? (
    <Icon
      name="chevron-down"
      role="control"
      className="text-muted-foreground"
    />
  ) : null;
}

function EffortLabel({
  configuration,
  wide,
}: TrailingProps): React.JSX.Element | null {
  const current = selectedChoice(configuration, 'model');

  if (!wide) return null;

  if (!supportsEffort(current)) return null;

  return <CurrentEffortLabel configuration={configuration} />;
}

function CurrentEffortLabel({
  configuration,
}: Pick<TrailingProps, 'configuration'>): React.JSX.Element | null {
  const selected = currentEffort(configuration).selected;

  return selected ? (
    <Text role="control" className="text-muted-foreground">
      {selected.name}
    </Text>
  ) : null;
}

function supportsEffort(current?: SessionConfigSelectOption): boolean {
  if (!current) return true;

  return choiceMetadata(current)?.supportsEffort !== false;
}
