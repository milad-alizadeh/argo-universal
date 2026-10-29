import type {
  ElicitationSchema,
  RequestPermissionRequest,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import type {
  PendingElicitation,
  PendingPermission,
  SessionPromptOutput,
  SessionSnapshot,
} from '@repo/contracts';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';

export type PromptSteps = readonly ScriptedStep[];

export type AcpEngine = Awaited<ReturnType<typeof startAcpEngine>>;

export type Outcomes = RequestPermissionResponse[];

export const alwaysAllow = 'edit-always';

export const allowOnce = 'edit-once';

export const reject = 'edit-reject';

export const createElicitation = 'elicitation/create';

export const alreadyAnswered = 'already answered';

export const unrecognised = 'The Agent sent an unrecognised message';

export const issueMessage = 'A few details for the new issue';

export const editToolTitle = 'Edit tool-a';

export const unknownElicitationId = 'unknown-elicitation';

export const cancelled = { outcome: { outcome: 'cancelled' } };

export const exactOptions: RequestPermissionRequest['options'] = [
  { optionId: alwaysAllow, name: 'Always allow edits', kind: 'allow_always' },
  { optionId: allowOnce, name: 'Allow', kind: 'allow_once' },
  { optionId: reject, name: 'Reject', kind: 'reject_once' },
];

export const issueSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', title: 'Title' },
    estimate: { type: 'integer', minimum: 1 },
  },
  required: ['title'],
} satisfies ElicitationSchema;

export const promptSession = (
  host: AcpEngine,
  sessionId: string,
): Promise<SessionPromptOutput> =>
  host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Edit both files' }],
  });

export const startSession = async (
  agent: string,
  steps: PromptSteps,
): Promise<{ host: AcpEngine; sessionId: string }> => {
  const host = await startAcpEngine({ steps }, undefined, agent);

  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    agent,
  });

  await promptSession(host, sessionId);

  return { host, sessionId };
};

export const waitForPermission = async (
  host: AcpEngine,
  sessionId: string,
  toolCallId?: string,
): Promise<PendingPermission> => {
  const snapshot = await waitForAcpSnapshot(
    host,
    sessionId,
    (candidate) =>
      candidate.pendingPermission !== null &&
      (toolCallId === undefined ||
        candidate.pendingPermission.toolCallId === toolCallId),
  );

  if (!snapshot.pendingPermission) throw new Error('No Permission request');

  return snapshot.pendingPermission;
};

export const waitForElicitation = async (
  host: AcpEngine,
  sessionId: string,
  message?: string,
): Promise<PendingElicitation> => {
  const snapshot = await waitForAcpSnapshot(
    host,
    sessionId,
    (candidate) =>
      candidate.pendingElicitation !== null &&
      (message === undefined ||
        candidate.pendingElicitation.message === message),
  );

  if (!snapshot.pendingElicitation) throw new Error('No Elicitation');

  return snapshot.pendingElicitation;
};

export const waitForTurnEnd = (
  host: AcpEngine,
  sessionId: string,
): Promise<SessionSnapshot> =>
  waitForAcpSnapshot(
    host,
    sessionId,
    (snapshot) => snapshot.activeTurnId === null,
  );
