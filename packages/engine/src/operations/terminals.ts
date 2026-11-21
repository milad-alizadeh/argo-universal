import type { terminalOperations } from '@repo/contracts/operations';
import type { Database } from '@repo/db';
import { TRPCError } from '@trpc/server';
import type { Runs } from '../runs';
import { createSessionReader } from '../sessions';
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
  const readSession = createSessionReader(database);

  return {
    'terminal.close': async ({ sessionId, shellId }) => {
      await runs.shells.close(runCheckoutOf(database, sessionId), shellId);

      return {};
    },
    'terminal.open': ({ sessionId }) => {
      const { projectId, checkout, archivedAt } = readSession(sessionId);

      if (archivedAt !== null)
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This Session is archived.',
        });

      return runs.shells.open(
        { projectId, checkoutPath: checkout.path },
        sessionId,
      );
    },
    'terminal.read': async ({ sessionId, scrollback, ...target }) => {
      const checkout = runCheckoutOf(database, sessionId);

      return 'shellId' in target
        ? runs.shells.read(checkout, target.shellId, scrollback)
        : runs.terminals.read(checkout, target.name, scrollback);
    },
    'terminal.resize': async ({ sessionId, columns, rows, ...target }) => {
      const checkout = runCheckoutOf(database, sessionId);
      const size = { columns, rows };

      if ('shellId' in target)
        runs.shells.resize(checkout, target.shellId, size);
      else await runs.terminals.resize(checkout, target.name, size);

      return {};
    },
    'terminal.send': async ({ sessionId, input, ...target }) => {
      const checkout = runCheckoutOf(database, sessionId);

      return 'shellId' in target
        ? runs.shells.send(checkout, target.shellId, input)
        : runs.terminals.send(checkout, target.name, input);
    },
  };
}
