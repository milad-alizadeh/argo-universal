import type { ConnectionState } from '#features/connection';
import type { ServerDetails } from './connection-detail-view';

interface InfoQuery {
  isPending: boolean;
  isError: boolean;
  error: { message: string } | null;
  data?: { version: string; startedAt: string; pid: number };
}

// While the Connection is down the page keeps its loading look and has no details of its own.
const unavailableDetails = (connection?: ConnectionState): ServerDetails =>
  connection === 'reconnecting' || connection === 'offline'
    ? { status: 'down' }
    : { status: 'loading' };

const unloadedDetails = (
  info: InfoQuery,
  connection?: ConnectionState,
): ServerDetails =>
  info.isError && info.error
    ? { status: 'error', message: info.error.message }
    : unavailableDetails(connection);

// What the view shows for the Server's info query and the latest clock tick.
export function toServerDetails(
  info: InfoQuery,
  clock?: string,
  connection?: ConnectionState,
): ServerDetails {
  if (info.isPending || !info.data) return unloadedDetails(info, connection);
  const { version, startedAt, pid } = info.data;

  return { status: 'loaded', version, startedAt, pid, clock };
}
