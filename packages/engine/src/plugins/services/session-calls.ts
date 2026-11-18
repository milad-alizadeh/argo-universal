import { CapabilityRefusal } from '../access/capability-refusal';
import type { PluginValue, PluginRequest } from '../protocol/runtime';
import type { PluginCall } from './plugin-calls';
import type { PluginPromptSender } from './plugin-service-options';

type SessionRequest = Extract<PluginRequest, { api: 'sessions' }>;

type PromptRequest = Extract<SessionRequest, { action: 'prompt' | 'withdraw' }>;

type OtherRequest = Exclude<SessionRequest, PromptRequest>;

const isPromptRequest = (request: SessionRequest): request is PromptRequest =>
  request.action === 'prompt' || request.action === 'withdraw';

// The calls under `sessions:prompt`: send a Prompt, or take back one it queued.
const answerPrompt = (
  call: PluginCall,
  request: PromptRequest,
): Promise<PluginValue> =>
  request.action === 'prompt'
    ? promptSession(call, request.sessionId, request.text)
    : withdrawPrompt(call, request.sessionId, request.queuedId);

const answerOther = (
  call: PluginCall,
  request: OtherRequest,
): Promise<PluginValue> =>
  request.action === 'get'
    ? readSession(call, request.sessionId)
    : archiveSession(call, request.sessionId);

export const answerSession = (
  call: PluginCall,
  request: SessionRequest,
): Promise<PluginValue> =>
  isPromptRequest(request)
    ? answerPrompt(call, request)
    : answerOther(call, request);

// `argo.sessions.get` reads a Session's Project and branch only under a `sessions:read` Grant (ADR-0030).
async function readSession(
  call: PluginCall,
  sessionId: string,
): Promise<PluginValue> {
  call.access().checkSessions('sessions:read');
  call.logCall();

  return (await call.options.sessionInfo?.(sessionId)) ?? null;
}

/*
 * `argo.sessions.archive` archives as the App does, with no confirm tier (ADR-0055). The Session must be one of
 * the Project the call runs for; core then refuses a Turn that runs, a child Session and a Checkout with uncommitted files.
 */
async function archiveSession(
  call: PluginCall,
  sessionId: string,
): Promise<PluginValue> {
  call.access().checkSessions('sessions:archive');
  call.logCall();
  await requireProjectSession(call, sessionId);
  await available(call.options.archiveSession, 'Archiving')(sessionId);

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
  call.access().checkSessions('sessions:prompt');
  call.logCall();
  await requireProjectSession(call, sessionId);

  return available(call.options.promptSession, 'Prompting')(
    sessionId,
    text,
    pluginSender(call),
  );
}

// `argo.sessions.withdraw` takes back a Queued Prompt this Plugin sent to a Session of the call's Project (ADR-0055).
async function withdrawPrompt(
  call: PluginCall,
  sessionId: string,
  queuedId: string,
): Promise<PluginValue> {
  call.access().checkSessions('sessions:prompt');
  call.logCall();
  await requireProjectSession(call, sessionId);

  return available(call.options.withdrawPrompt, 'Withdrawing Prompts from')(
    sessionId,
    queuedId,
    pluginSender(call),
  );
}

// The Feed names a Plugin's Prompt by the Plugin's title.
const pluginSender = (call: PluginCall): PluginPromptSender => ({
  pluginId: call.pluginId,
  title: call.activated()?.title || call.pluginId,
});

// An act the Engine has not attached is refused, as when no Sessions exist yet.
function available<Act>(act: Act | undefined, verb: string): Act {
  if (!act) throw new Error(`${verb} Sessions is not available`);

  return act;
}

const inProject = (
  call: PluginCall,
  info: { projectId: string } | null | undefined,
): boolean => Boolean(call.projectId) && info?.projectId === call.projectId;

async function requireProjectSession(
  call: PluginCall,
  sessionId: string,
): Promise<void> {
  const info = await call.options.sessionInfo?.(sessionId);

  if (!inProject(call, info))
    throw new CapabilityRefusal(
      `Session ${sessionId} is not in the Project this call runs for`,
    );
}
