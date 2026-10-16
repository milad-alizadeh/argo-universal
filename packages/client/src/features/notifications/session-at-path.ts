import { newSessionId } from '../../lib/product/navigation/new-session';

export function notificationSessionAt(path: string): string | null {
  const sessionId = pathSessionId(path);

  return sessionId === newSessionId ? null : sessionId;
}

const pathSessionId = (path: string): string | null =>
  /^\/sessions\/([^/]+)\/?$/.exec(path)?.[1] ?? null;
