type Given = { projectId: string; sessionId?: string };

// The Project and Session an Operation acts for.
export type SessionCaller = { projectId: string; sessionId: string };

/*
 * The App runs these Operations as a person, who core never lets run a Session-only Operation, so the Session is a
 * param there; an Agent's own run carries its Session. Whichever it is, core has set the Project, and each Operation
 * checks that the Session belongs to it.
 */
export function sessionCaller(
  params: { sessionId?: string },
  caller: Given,
): SessionCaller {
  const sessionId = params.sessionId ?? caller.sessionId;

  if (!sessionId) throw new Error('This needs a Session: pass its sessionId.');

  return { projectId: caller.projectId, sessionId };
}
