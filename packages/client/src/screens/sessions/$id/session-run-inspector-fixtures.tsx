import type { RunOutputCursor, RunOutput } from '@repo/contracts';
import type { ReactElement } from 'react';
import {
  webRun,
  workbenchRuns,
  workbenchRunTime,
} from '../../../features/sessions/components/session-workbench-runs-fixtures';
import { RunTerminal, type RunOutputSource } from './run-terminal';
import type { SessionRuns } from './sections/runs-section';

const recorded = [
  '\u001b[32m>\u001b[0m Starting server\r\n',
  'Listening on http://localhost:3100\r\n',
  'Ready for requests\r\n',
].join('');

export const outputText = 'Ready for requests';

function frame(record: string): RunOutput {
  return {
    cursor: { runId: 'web-fixture', offset: record.length },
    data: btoa(record),
  };
}

export { webRun };

export function recordRun(
  _cursor: RunOutputCursor | undefined,
  receive: Parameters<RunOutputSource>[1],
): () => void {
  receive(frame(recorded));

  return () => {};
}

export const runActions = {
  runs: workbenchRuns,
  now: workbenchRunTime,
  onStart: () => {},
  onStop: () => {},
  onRestart: () => {},
  renderTerminal: (run): ReactElement => (
    <RunTerminal run={run} connected listen={recordRun} onInput={() => {}} />
  ),
} satisfies SessionRuns;
