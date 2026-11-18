import { todoOperationIds, type SessionUpdate } from '@repo/contracts';
import { calledOperation } from './operation-call';

const todoOperations = new Set<string>(todoOperationIds);

// The Composer already shows the Session's checklist (ADR-0053).
export const isTodoCall = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'tool_call_update' &&
  todoOperations.has(calledOperation(row) ?? '');
