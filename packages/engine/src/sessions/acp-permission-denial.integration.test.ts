import type { RequestPermissionRequest } from '@agentclientprotocol/sdk';
import type { SessionUpdate } from '@repo/contracts';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';

type PromptResponses = NonNullable<
  ScriptedScenario['responses']
>['session/prompt'];

const options: RequestPermissionRequest['options'] = [
  { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
  { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
];

// An Agent that asks before a Tool call and then ends its Turn as it is told to.
const askSteps = (): NonNullable<PromptResponses>[number]['steps'] => [
  {
    type: 'permission',
    request: { toolCall: { toolCallId: 'edit', title: 'Edit' }, options },
    responses: [],
  },
];

const askThen = (
  stopReason: 'end_turn' | 'cancelled',
): NonNullable<PromptResponses> => [
  { steps: askSteps(), result: { stopReason } },
];

type AcpEngine = Awaited<ReturnType<typeof startAcpEngine>>;

const startSession = async (
  prompts: PromptResponses,
): Promise<{ host: AcpEngine; sessionId: string }> => {
  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': prompts },
  });

  const session = await host.caller.session.new(emptySessionInput);

  return { host, sessionId: session.sessionId };
};

const answerRequest = async (
  host: AcpEngine,
  sessionId: string,
  optionId: string,
): Promise<void> => {
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Create a file' }],
  });

  const snapshot = await waitForAcpSnapshot(
    host,
    sessionId,
    (candidate) => candidate.pendingPermission !== null,
  );

  await host.caller.session.answerPermission({
    sessionId,
    requestId: snapshot.pendingPermission?.requestId ?? '',
    optionId,
  });
};

const endingRow = async (
  host: AcpEngine,
  sessionId: string,
): Promise<SessionUpdate | undefined> => {
  await waitForAcpSessionIdle(host, sessionId);

  const page = await host.caller.feed.page({ sessionId, direction: 'tail' });

  return page.rows.at(-1);
};

describe('a Turn that ends after a Permission request', () => {
  it('records a denial the Agent ended the Turn over as a denial, not a Stop', async () => {
    const { host, sessionId } = await startSession(askThen('cancelled'));
    await answerRequest(host, sessionId, 'reject');

    expect(await endingRow(host, sessionId)).toMatchObject({
      sessionUpdate: 'notice',
      state: 'settled',
      _meta: {
        argo: {
          turnEnd: {
            stopReason: 'cancelled',
            error: null,
            permissionDenied: true,
          },
        },
      },
    });
  });

  it('leaves an approved Turn as the Agent ended it', async () => {
    const { host, sessionId } = await startSession(askThen('end_turn'));
    await answerRequest(host, sessionId, 'allow');
    const ending = await endingRow(host, sessionId);

    expect(ending).toMatchObject({
      _meta: { argo: { turnEnd: { stopReason: 'end_turn', error: null } } },
    });
    expect(JSON.stringify(ending)).not.toContain('permissionDenied');
  });

  it('keeps a Stop after a denial a Stop', async () => {
    const { host, sessionId } = await startSession([
      {
        steps: [...(askSteps() ?? []), { type: 'wait-for-cancel' }],
        result: { stopReason: 'cancelled' },
      },
    ]);

    await answerRequest(host, sessionId, 'reject');
    await host.caller.session.cancel({ sessionId });
    const ending = await endingRow(host, sessionId);

    expect(ending).toMatchObject({
      _meta: { argo: { turnEnd: { stopReason: 'cancelled', error: null } } },
    });
    expect(JSON.stringify(ending)).not.toContain('permissionDenied');
  });
});
