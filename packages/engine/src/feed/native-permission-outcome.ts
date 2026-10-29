import type { PendingPermission, FeedChange } from '@repo/contracts';
import { permissionOutcomeChange } from './turn-ending';

export const nativePermissionOutcomeEvent = 'feed.nativePermissionOutcome';

export type NativePermissionOutcomeEvent = {
  type: typeof nativePermissionOutcomeEvent;
  turnId: string | null;
  rowId: string;
  option?: PendingPermission['options'][number];
};

export const nativePermissionOutcome = (
  event: NativePermissionOutcomeEvent,
): FeedChange =>
  permissionOutcomeChange(
    event.rowId,
    event.option
      ? { outcome: 'selected', ...event.option }
      : { outcome: 'cancelled' },
  );
