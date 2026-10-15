import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { publishAgentModelConfiguration } from '../agent-model-sheet-context';
import type { ComposerConfigurationProps } from './configuration-types';
import { currentEffort } from './configuration-values';

export function useCommitEffortFallback(
  configuration: ComposerConfigurationProps,
): void {
  const effort = currentEffort(configuration);
  const fallbackValue = fallbackEffortValue(effort);
  const effortConfigId = effort.option?.configId;
  const onConfigChange = useRef(configuration.onConfigChange);
  useEffect(() => {
    onConfigChange.current = configuration.onConfigChange;
  });
  useEffect(() => {
    if (effortConfigId && fallbackValue)
      onConfigChange.current(effortConfigId, fallbackValue);
  }, [effortConfigId, fallbackValue]);
}

// Phones present the Agent and model menu as a native sheet route with its own stack of pages.
const nativeSheet = Platform.OS !== 'web';

const presentSheet = (): void => router.push('/agent-model');

export function useAgentModelSheet(
  configuration: ComposerConfigurationProps,
): (() => void) | undefined {
  useEffect(() => {
    if (nativeSheet) publishAgentModelConfiguration(configuration);
  }, [configuration]);

  return nativeSheet ? presentSheet : undefined;
}

function fallbackEffortValue(
  effort: ReturnType<typeof currentEffort>,
): string | undefined {
  return effort.fallback ? effort.selected?.value : undefined;
}
