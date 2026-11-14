import type { Argo } from '@argo/plugin-kit';

type Given = { projectId: string; sessionId?: string };

// The Project and Session an Operation acts for.
export type SessionCaller = { projectId: string; sessionId: string };

// An Agent acts for the Session it runs in and may name no other.
function agentSession(named: string | undefined, own: string): string {
  if (named !== undefined && named !== own)
    throw new Error('A Session can only act for itself.');

  return own;
}

function sessionIdOf(params: { sessionId?: string }, caller: Given): string {
  if (caller.sessionId !== undefined)
    return agentSession(params.sessionId, caller.sessionId);

  if (!params.sessionId)
    throw new Error('This needs a Session: pass its sessionId.');

  return params.sessionId;
}

type SessionInfo = NonNullable<Awaited<ReturnType<Argo['sessions']['get']>>>;

// The caller's Session, which must belong to the caller's Project.
export async function sessionInProject(
  { sessions }: Pick<Argo, 'sessions'>,
  { projectId, sessionId }: SessionCaller,
): Promise<SessionInfo> {
  const session = await sessions.get(sessionId);

  if (session?.projectId !== projectId)
    throw new Error('This Session does not belong to this Project.');

  return session;
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

  await sessionInProject(argo, acting);

  return acting;
}
