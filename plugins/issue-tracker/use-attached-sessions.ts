import { useCallback } from '@argo/plugin-kit';
import type { IssueDeps } from './issue-deps';
import { useCall } from './use-call';

// A Session an Agent attached to this Issue, named as the App names it.
export type AttachedSession = {
  sessionId: string;
  title: string;
  branch: string | null;
};

type Source = Pick<IssueDeps, 'storage' | 'getSession'>;

async function namedSession(
  getSession: IssueDeps['getSession'],
  sessionId: string,
): Promise<AttachedSession[]> {
  const session = await getSession(sessionId).catch(() => null);

  if (!session) return [];

  return [{ sessionId, title: session.title, branch: session.branch }];
}

async function attachedSessions(
  { storage, getSession }: Source,
  projectId: string,
  number: number,
): Promise<AttachedSession[]> {
  const attached = await storage.issueSessions({ projectId, number });

  const found = await Promise.all(
    attached.map(({ sessionId }) => namedSession(getSession, sessionId)),
  );

  return found.flat();
}

// The Sessions this Plugin stored for the Issue, each named by the App; one that has since gone is left out.
export function useAttachedSessions(
  { storage, getSession }: Source,
  projectId: string,
  number: number,
): AttachedSession[] {
  const { value } = useCall(
    useCallback(
      () => attachedSessions({ storage, getSession }, projectId, number),
      [storage, getSession, projectId, number],
    ),
  );

  return value ?? [];
}
