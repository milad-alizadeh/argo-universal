import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  publishAgentModelConfiguration,
  useNativeSheets,
} from '../agent-model-sheet-context';
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

export function useAgentModelSheet(
  configuration: ComposerConfigurationProps,
): (() => void) | undefined {
  const sheets = useNativeSheets();
  const presentSheet = sheets?.agentModel;
  const nativeSheet = hasNativeSheet(presentSheet);
  useEffect(() => {
    if (nativeSheet) publishAgentModelConfiguration(configuration);
  }, [nativeSheet, configuration]);

  return nativeSheet ? presentSheet : undefined;
}

function fallbackEffortValue(
  effort: ReturnType<typeof currentEffort>,
): string | undefined {
  return effort.fallback ? effort.selected?.value : undefined;
}

function hasNativeSheet(presentSheet?: () => void): boolean {
  return !!presentSheet && Platform.OS !== 'web';
}
