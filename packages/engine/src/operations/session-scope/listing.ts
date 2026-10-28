import type { OperationRow } from '@repo/contracts/operations';
import type { SessionOperationCall } from '../../sessions';

const needsTurn = 'A Permission request requires an active Turn';

// Discovery shows confirm Operations disabled while the calling Turn could not ask the user.
export function scopedOperations(
  rows: OperationRow[],
  call?: Pick<SessionOperationCall, 'canConfirm'>,
): OperationRow[] {
  if (!call) return rows;

  if (call.canConfirm) return rows;

  return rows.map((row) =>
    row.tier === 'confirm'
      ? { ...row, enabled: false, disabledReason: needsTurn }
      : row,
  );
}
