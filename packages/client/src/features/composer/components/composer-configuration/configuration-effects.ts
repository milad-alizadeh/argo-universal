import { useEffect, useRef } from 'react';
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

function fallbackEffortValue(
  effort: ReturnType<typeof currentEffort>,
): string | undefined {
  return effort.fallback ? effort.selected?.value : undefined;
}
