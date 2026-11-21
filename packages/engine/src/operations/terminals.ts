import type { terminalOperations } from '@repo/contracts/operations';
import type { Database } from '@repo/db';
import type { Runs } from '../runs';
import type { OperationImplementations } from './operations';
import { runCheckoutOf } from './runs';

type TerminalImplementations = Pick<
  OperationImplementations,
  keyof typeof terminalOperations
>;

export function createTerminalOperations(deps: {
  database: Database;
  runs: Runs;
}): TerminalImplementations {
  const { database, runs } = deps;

  return {
    'terminal.read': async ({ sessionId, name, scrollback }) =>
      runs.terminals.read(runCheckoutOf(database, sessionId), name, scrollback),
    'terminal.resize': async ({ sessionId, name, columns, rows }) => {
      await runs.terminals.resize(runCheckoutOf(database, sessionId), name, {
        columns,
        rows,
      });

      return {};
    },
    'terminal.send': async ({ sessionId, name, input }) =>
      runs.terminals.send(runCheckoutOf(database, sessionId), name, input),
  };
}
