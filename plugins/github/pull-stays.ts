import type { Argo } from '@argo/plugin-kit';

// Whether a pull request's Session is still in its Project. A Session that is gone has its choice forgotten; one in another Project keeps it, as it can move back, and waits.
export async function sessionStays(
  sessions: Pick<Argo['sessions'], 'get'>,
  link: { sessionId: string; projectId: string },
  forget: () => Promise<void>,
): Promise<boolean> {
  const session = await sessions.get(link.sessionId);

  if (!session) await forget();

  return session?.projectId === link.projectId;
}
