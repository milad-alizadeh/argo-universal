import type { SessionUpdate } from '@repo/contracts';
import type { AcpContentInput } from './assembly';

const sessionWideKinds = new Set([
  'plan',
  'plan_update',
  'plan_removed',
  'notice',
]);

const settledTurnReason = 'ACP update belongs to a settled Turn';

const belongsToAnotherTurn = (
  input: AcpContentInput,
  row: SessionUpdate | undefined,
): boolean => row?.turnId != null && row.turnId !== input.turnId;

export const settledUpdateRejection = (
  input: AcpContentInput,
  row: SessionUpdate | undefined,
): string | undefined => {
  if (preservesSessionScope(input, row)) return undefined;

  return belongsToAnotherTurn(input, row) ? settledTurnReason : undefined;
};

const preservesSessionScope = (
  input: AcpContentInput,
  row: SessionUpdate | undefined,
): boolean =>
  sessionWideKinds.has(input.update.sessionUpdate) || isUnscopedRow(row);

const isUnscopedRow = (row: SessionUpdate | undefined): boolean =>
  row !== undefined && row.turnId === null;
