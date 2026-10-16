import type { ServerDetails } from './connection-detail-view';

interface InfoQuery {
  isPending: boolean;
  isError: boolean;
  error: { message: string } | null;
  data?: { version: string; startedAt: string; pid: number };
}

const unloadedDetails = (info: InfoQuery): ServerDetails =>
  info.isError && info.error
    ? { status: 'error', message: info.error.message }
    : { status: 'loading' };

// What the view shows for the Server's info query and the latest clock tick.
export function toServerDetails(
  info: InfoQuery,
  clock?: string,
): ServerDetails {
  if (info.isPending || !info.data) return unloadedDetails(info);
  const { version, startedAt, pid } = info.data;

  return { status: 'loaded', version, startedAt, pid, clock };
}
