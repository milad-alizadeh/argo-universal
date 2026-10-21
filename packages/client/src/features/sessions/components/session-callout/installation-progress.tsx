import { ProgressBar } from '@repo/kit/primitives/status/progress-bar';
import type { ReactElement } from 'react';

export function InstallationProgress({
  progress,
}: {
  progress?: number | null;
}): ReactElement | null {
  if (progress === undefined) return null;

  return (
    <ProgressBar
      value={progress ?? 1}
      indeterminate={progress === null}
      active
      accessibilityLabel="Installing Agent"
    />
  );
}
