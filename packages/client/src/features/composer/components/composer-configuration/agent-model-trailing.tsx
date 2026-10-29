import { Icon } from '@repo/kit/primitives/content/icon';
import type * as React from 'react';
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

export function AgentModelTrailing({
  configuration,
}: TrailingProps): React.JSX.Element | null {
  const fast = switches(configuration).some(
    (option) => isFastMode(option) && option.currentValue,
  );

  return fast ? <Icon name="fast-mode" filled testID="fast-mode-on" /> : null;
}

export function agentModelEffort({
  configuration,
  wide,
}: TrailingProps): string | undefined {
  if (!wide) return undefined;

  if (!modelSupportsEffort(configuration)) return undefined;

  return effortName(configuration);
}

function modelSupportsEffort(
  configuration: ComposerConfigurationProps,
): boolean {
  const model = selectedChoice(configuration, 'model');

  return model ? choiceMetadata(model)?.supportsEffort !== false : true;
}

const effortName = (
  configuration: ComposerConfigurationProps,
): string | undefined => currentEffort(configuration).selected?.name;
