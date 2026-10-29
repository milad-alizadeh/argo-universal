import type { readerOperations } from '@repo/contracts/operations';
import type { SessionPorts } from '../sessions';
import type { OperationImplementations } from './operations';

type ReadImplementations = Pick<
  OperationImplementations,
  keyof typeof readerOperations
>;

export function createReadOperations({
  reads,
}: SessionPorts): ReadImplementations {
  return {
    'session.diff': (input) => reads.diff(input),
    'session.changes': (input) => reads.changes(input),
    'session.feed': async (input) => reads.feed(input),
    'session.get': async (input) => reads.get(input),
    'session.list': (input) => reads.list(input),
    'session.listAgents': async (input) => reads.agents(input),
    'session.listShells': async (input) => reads.shells(input.sessionId),
    'session.listBranches': (input) => reads.branches(input),
  };
}
