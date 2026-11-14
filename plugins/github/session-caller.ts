import type { Argo } from '@argo/plugin-kit';

type Given = { projectId: string; sessionId?: string };

// The Project and Session an Operation acts for.
export type SessionCaller = { projectId: string; sessionId: string };

function sessionIdOf(params: { sessionId?: string }, caller: Given): string {
  if (caller.sessionId !== undefined) {
    if (params.sessionId !== undefined && params.sessionId !== caller.sessionId)
      throw new Error('A Session can only act for itself.');

    return caller.sessionId;
  }

  if (!params.sessionId)
    throw new Error('This needs a Session: pass its sessionId.');

  return params.sessionId;
}

async function requireInProject(
  { sessions }: Pick<Argo, 'sessions'>,
  { projectId, sessionId }: SessionCaller,
): Promise<void> {
  const session = await sessions.get(sessionId);

  if (session?.projectId !== projectId)
    throw new Error('This Session does not belong to this Project.');
}

/*
 * The App runs these Operations as a person, who core never lets run a Session-only Operation, so the Session is a
 * param there; an Agent's own run carries its Session, and may name no other. Whichever it is, core has set the Project, and the Session must
 * belong to it: a Session outside the Project is refused.
 */
export async function sessionCaller(
  argo: Pick<Argo, 'sessions'>,
  params: { sessionId?: string },
  caller: Given,
): Promise<SessionCaller> {
  const acting = {
    projectId: caller.projectId,
    sessionId: sessionIdOf(params, caller),
  };

  await requireInProject(argo, acting);

  return acting;
}
