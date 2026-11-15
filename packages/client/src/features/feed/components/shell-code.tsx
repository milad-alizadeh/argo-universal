import {
  ResourceCode,
  type SyntaxRun,
} from '@repo/kit/primitives/content/code';
import type * as React from 'react';
import { type ReactNode, useMemo } from 'react';
import { shellRuns } from './shell-runs';

interface ShellCodeProps {
  command: string;
  output?: string;
  footer?: ReactNode;
}

const runsText = (runs: SyntaxRun[]): string =>
  runs.map((run) => run.text).join('');

// A command line and whatever it has printed, under Argo's own "Shell" heading.
export function ShellCode({
  command,
  output,
  footer,
}: ShellCodeProps): React.JSX.Element {
  const runs = useMemo(() => shellRuns(command, output), [command, output]);

  return (
    <ResourceCode
      title="Shell"
      code={runsText(runs)}
      runs={runs}
      footer={footer}
    />
  );
}
