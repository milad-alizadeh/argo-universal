import type { terminalOperations } from '@repo/contracts/operations';
import type { Runs } from '../runs';
import type { OperationImplementations } from './operations';

type TerminalImplementations = Pick<
  OperationImplementations,
  keyof typeof terminalOperations
>;

export function createTerminalOperations({
  runs,
}: {
  runs: Runs;
}): TerminalImplementations {
  return {
    'terminal.close': async ({ sessionId, shellId }) => {
      await runs.terminalLifecycle.closeShell(sessionId, shellId);

      return {};
    },
    'terminal.open': ({ sessionId }) =>
      runs.terminalLifecycle.openShell(sessionId),
    'terminal.read': ({ sessionId, scrollback, ...target }) =>
      runs.terminals.read(
        runs.sessions.checkout(sessionId),
        target,
        scrollback,
      ),
    'terminal.resize': async ({ sessionId, columns, rows, ...target }) => {
      await runs.terminals.resize(runs.sessions.checkout(sessionId), target, {
        columns,
        rows,
      });

      return {};
    },
    'terminal.send': ({ sessionId, input, ...target }) =>
      runs.terminals.send(runs.sessions.checkout(sessionId), target, input),
  };
}
