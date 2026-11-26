import type { Argo } from '@argo/plugin-kit';

type Given = { projectId: string; sessionId?: string };

// The Project and Session an Operation acts for.
export type SessionCaller = { projectId: string; sessionId: string };

type SessionInfo = NonNullable<Awaited<ReturnType<Argo['sessions']['get']>>>;

type Sessions = Pick<Argo, 'sessions'>;

// An Agent acts for the Session it runs in, or for a Session it started; it may name no other.
async function agentSession(
  { sessions }: Sessions,
  named: string | undefined,
  own: string,
): Promise<string> {
  if (named === undefined || named === own) return own;

  if ((await sessions.get(named))?.startedBySessionId !== own)
    throw new Error(
      'A Session can only act for itself or for a Session it started.',
    );

  return named;
}

async function sessionIdOf(
  argo: Sessions,
  params: { sessionId?: string },
  caller: Given,
): Promise<string> {
  if (caller.sessionId !== undefined)
    return agentSession(argo, params.sessionId, caller.sessionId);

  if (!params.sessionId)
    throw new Error('This needs a Session: pass its sessionId.');

  return params.sessionId;
}

// The caller's Session, which must belong to the caller's Project.
export async function sessionInProject(
  { sessions }: Sessions,
  { projectId, sessionId }: SessionCaller,
): Promise<SessionInfo> {
  const session = await sessions.get(sessionId);

  if (session?.projectId !== projectId)
    throw new Error('This Session does not belong to this Project.');

  return session;
}

/*
 * The App runs these Operations as a person, who core never lets run a Session-only Operation, so the Session is a
 * param there; an Agent's own run carries its Session, and may name only a Session it started. Whichever it is, core has set the Project, and the Session must
 * belong to it: a Session outside the Project is refused.
 */
export async function sessionCaller(
  argo: Sessions,
  params: { sessionId?: string },
  caller: Given,
): Promise<SessionCaller> {
  const acting = {
    projectId: caller.projectId,
    sessionId: await sessionIdOf(argo, params, caller),
  };

  await sessionInProject(argo, acting);

  return acting;
}
