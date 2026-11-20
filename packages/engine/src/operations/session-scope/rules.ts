import { operations, type OperationId } from '@repo/contracts/operations';
import type { DirectorySession, OperationCard } from '../../sessions';
import type { SessionCaller } from '../session-tokens';

// A Session the caller started: one of its own Agents, wherever it runs.
export const startedByCaller = (
  caller: SessionCaller,
  session: DirectorySession,
): boolean => session.startedBySessionId === caller.sessionId;

// The Permission request card: the Operation's label, and its description.
export const operationCard = (id: OperationId): OperationCard => ({
  title: operations[id].label,
  description: operations[id].description,
});
