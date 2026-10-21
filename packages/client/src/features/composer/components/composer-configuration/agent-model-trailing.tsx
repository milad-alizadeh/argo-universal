import type { SessionConfigSelectOption } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  currentEffort,
  selectedChoice,
  switches,
  isFastMode,
  choiceMetadata,
} from './configuration-values';

interface TrailingProps {
  configuration: ComposerConfigurationProps;
  wide: boolean;
}

// What sits between the model and the trigger's chevron: the effort, wide, and whether fast mode is on.
export function AgentModelTrailing(props: TrailingProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-1.5">
      <EffortLabel {...props} />
      <FastModeIndicator configuration={props.configuration} />
    </View>
  );
}

function FastModeIndicator({
  configuration,
}: Pick<TrailingProps, 'configuration'>): React.JSX.Element | null {
  const fastOn = switches(configuration).some(
    (option) => isFastMode(option) && option.currentValue,
  );

  return fastOn ? (
    <Icon role="control" name="fast-mode" filled testID="fast-mode-on" />
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
    <Text role="badge" tone="muted" numberOfLines={1}>
      {selected.name}
    </Text>
  ) : null;
}

function supportsEffort(current?: SessionConfigSelectOption): boolean {
  if (!current) return true;

  return choiceMetadata(current)?.supportsEffort !== false;
}
