import { CapabilityRefusal } from '../access/capability-refusal';
import type { PluginValue, PluginRequest } from '../protocol/runtime';
import type { PluginCall } from './plugin-calls';

type SessionRequest = Extract<PluginRequest, { api: 'sessions' }>;

export function answerSession(
  call: PluginCall,
  request: SessionRequest,
): Promise<PluginValue> {
  if (request.action === 'prompt')
    return promptSession(call, request.sessionId, request.text);

  return request.action === 'get'
    ? readSession(call, request.sessionId)
    : archiveSession(call, request.sessionId);
}

// `argo.sessions.get` reads a Session's Project and branch only under a `sessions:read` Grant (ADR-0030).
async function readSession(
  call: PluginCall,
  sessionId: string,
): Promise<PluginValue> {
  call.access().checkSessionsRead();
  call.logCall();

  return (await call.options.sessionInfo?.(sessionId)) ?? null;
}

/*
 * `argo.sessions.archive` archives as the App does, with no confirm tier (ADR-0055). The Session must be one of
 * the Project the call runs for; the App's own archive then refuses a Turn that runs and a child Session.
 */
async function archiveSession(
  call: PluginCall,
  sessionId: string,
): Promise<PluginValue> {
  call.access().checkSessionsArchive();
  call.logCall();

  const info = await call.options.sessionInfo?.(sessionId);

  requireProjectSession(call, sessionId, info);

  if (!call.options.archiveSession)
    throw new Error('Archiving Sessions is not available');

  await call.options.archiveSession(sessionId);

  return null;
}

/*
 * `argo.sessions.prompt` sends the Plugin's text to a Session of the Project the call runs for, with the Plugin as
 * sender (ADR-0055). An idle Session starts a Turn; a busy or paused one queues it.
 */
async function promptSession(
  call: PluginCall,
  sessionId: string,
  text: string,
): Promise<PluginValue> {
  call.access().checkSessionsPrompt();
  call.logCall();
  requireProjectSession(
    call,
    sessionId,
    await call.options.sessionInfo?.(sessionId),
  );

  if (!call.options.promptSession)
    throw new Error('Prompting Sessions is not available');

  return call.options.promptSession(sessionId, text, {
    pluginId: call.pluginId,
    title: call.activated()?.title || call.pluginId,
  });
}

function requireProjectSession(
  call: PluginCall,
  sessionId: string,
  info: { projectId: string } | null | undefined,
): void {
  if (!call.projectId || info?.projectId !== call.projectId)
    throw new CapabilityRefusal(
      `Session ${sessionId} is not in the Project this call runs for`,
    );
}
