import type { ShellTerminal } from '@repo/contracts';
import type { ReactElement } from 'react';
import {
  RunTerminal,
  type RunOutputSource,
  type SessionRuns,
} from '#features/sessions';
import { runActions } from './session-run-inspector-fixtures';

export const shellTerminal = {
  id: 'shell-fixture',
  name: 'Terminal',
  cwd: '/Developer/argo-universal',
} satisfies ShellTerminal;

const recorded =
  'argo-universal $ pwd\r\n/Developer/argo-universal\r\nargo-universal $ ';

const listen: RunOutputSource = (_cursor, receive) => {
  receive({
    cursor: { runId: shellTerminal.id, offset: recorded.length },
    data: btoa(recorded),
  });

  return () => {};
};

export const shellTerminalActions = {
  ...runActions,
  shells: [shellTerminal],
  openShell: (): void => {},
  closeShell: (): void => {},
  renderShell: ({ name }): ReactElement => (
    <RunTerminal
      run={{ name, status: 'ready' }}
      connected
      listen={listen}
      onInput={(): void => {}}
      onResize={(): void => {}}
    />
  ),
} satisfies SessionRuns;
