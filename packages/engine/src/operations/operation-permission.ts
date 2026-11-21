import type { OperationPolicy, OperationRow } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';

const needsPermissionTurn = 'A Permission request requires an active Turn';

export function operationPermission(
  policy: OperationPolicy,
  app: boolean,
  outsideProject = false,
): 'allow' | 'ask' | 'person-only' | 'archive' {
  if (app) return 'allow';

  if (policy === 'ask-outside-project') return outsideProject ? 'ask' : 'allow';

  return policy;
}

export function requirePermissionTurn(): never {
  throw new TRPCError({ code: 'CONFLICT', message: needsPermissionTurn });
}

export function availableOperations(
  rows: OperationRow[],
  canConfirm: boolean,
): OperationRow[] {
  return rows
    .values()
    .filter(
      ({ policy }) => operationPermission(policy, false) !== 'person-only',
    )
    .map((row) => forCaller(row, canConfirm))
    .toArray();
}

function withoutApproval(row: OperationRow): OperationRow {
  return row.enabled &&
    row.askWhen === undefined &&
    operationPermission(row.policy, false) === 'ask'
    ? { ...row, enabled: false, disabledReason: needsPermissionTurn }
    : row;
}

function forCaller(row: OperationRow, canConfirm: boolean): OperationRow {
  const visible = mayAsk(row.policy)
    ? { ...row, canRequestApproval: canConfirm }
    : row;

  return canConfirm ? visible : withoutApproval(visible);
}

function mayAsk(policy: OperationPolicy): boolean {
  return (
    policy === 'ask' || policy === 'archive' || policy === 'ask-outside-project'
  );
}
