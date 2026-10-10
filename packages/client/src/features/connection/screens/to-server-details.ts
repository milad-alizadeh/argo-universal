import type { ServerDetails } from '../components/connection-view';

interface InfoQuery {
  isPending: boolean;
  isError: boolean;
  error: { message: string } | null;
  data?: { version: string; startedAt: string; pid: number };
}

// What the view shows for the Server's info query and the latest clock tick.
export function toServerDetails(
  info: InfoQuery,
  clock?: string,
): ServerDetails {
  if (info.isPending || !info.data) {
    if (info.isError && info.error)
      return { status: 'error', message: info.error.message };
    return { status: 'loading' };
  }
  const { version, startedAt, pid } = info.data;
  return { status: 'loaded', version, startedAt, pid, clock };
}
