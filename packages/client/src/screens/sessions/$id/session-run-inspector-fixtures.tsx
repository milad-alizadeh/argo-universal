import type { RunOutputCursor, RunOutput } from '@repo/contracts';
import type { ReactElement } from 'react';
import {
  runIsActive,
  RunTerminal,
  type RunOutputSource,
} from '#features/sessions';
import type { SessionRuns } from '#features/sessions';
import {
  webRun,
  workbenchRuns,
  workbenchRunTime,
} from '../../../../mocks/run-configurations';

const recorded = [
  '\u001b[32m>\u001b[0m Starting server\r\n',
  'Listening on http://localhost:3100\r\n',
  'Ready for requests\r\n',
].join('');

export const outputText = 'Ready for requests';

const recording: RunOutput = {
  cursor: { runId: 'web-fixture', offset: recorded.length },
  data: 'G1szMm0+G1swbSBTdGFydGluZyBzZXJ2ZXINCkxpc3RlbmluZyBvbiBodHRwOi8vbG9jYWxob3N0OjMxMDANClJlYWR5IGZvciByZXF1ZXN0cw0K',
};

export { webRun };

export function recordRun(
  _cursor: RunOutputCursor | undefined,
  receive: Parameters<RunOutputSource>[1],
): () => void {
  receive(recording);

  return () => {};
}

const escaped = 'Terminal received Esc\r\n';

const echo: RunOutput = {
  cursor: { ...recording.cursor, offset: recorded.length + escaped.length },
  data: 'VGVybWluYWwgcmVjZWl2ZWQgRXNjDQo=',
};

interface PhoneRunLog {
  listen: RunOutputSource;
  onInput: (text: string) => void;
}

// The phone preview exercises both directions of Expo's DOM bridge with a deterministic recording.
export function createPhoneRunLog(): PhoneRunLog {
  let receiver: Parameters<RunOutputSource>[1] | undefined;
  let sent = false;

  return {
    listen(cursor, receive) {
      receiver = receive;
      const offset = cursor?.offset ?? 0;

      if (offset < recording.cursor.offset) receive(recording);

      if (sent && offset < echo.cursor.offset) receive(echo);

      return (): void => {
        if (receiver === receive) receiver = undefined;
      };
    },
    onInput(text): void {
      if (text !== '\u001b' || sent) return;

      sent = true;
      receiver?.(echo);
    },
  };
}

export const runActions = {
  runs: workbenchRuns,
  now: workbenchRunTime,
  onStart: (): void => {},
  onStop: (): void => {},
  onRestart: (): void => {},
  renderTerminal: (run): ReactElement => (
    <RunTerminal
      name={run.name}
      interactive={runIsActive(run)}
      connected
      listen={recordRun}
      onInput={(): void => {}}
      onResize={(): void => {}}
    />
  ),
} satisfies SessionRuns;
