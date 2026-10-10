import type { ConnectionState } from '#features/connection';

// The notice shows only while the Connection is open: offline and reconnecting have their own banner.
export function liveUpdatesStopped(
  subscriptionStatus: string,
  connection: ConnectionState,
): boolean {
  return subscriptionStatus === 'error' && connection === 'open';
}
