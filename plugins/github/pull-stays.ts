import type { Argo } from '@argo/plugin-kit';

/*
 * Whether a Session still takes an automation's turns: it is still the Project's and not archived. A Session that is
 * gone or archived has the automation forgotten, as an archived Session takes no Prompts and is no longer work in
 * progress; one moved to another Project keeps it, as it can move back.
 */
export async function sessionStays(
  sessions: Pick<Argo['sessions'], 'get'>,
  link: { sessionId: string; projectId: string },
  forget: () => Promise<void>,
): Promise<boolean> {
  const session = await sessions.get(link.sessionId);

  if (!session || session.archived) {
    await forget();

    return false;
  }

  return session.projectId === link.projectId;
}
