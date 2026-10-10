import type {
  AgentRequestHandlersByMethod,
  CreateElicitationRequest,
  CreateElicitationResponse,
  RequestPermissionRequest,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import type {
  Notice,
  PendingElicitation,
  PendingPermission,
  SessionSnapshot,
} from '@repo/contracts';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  sendAcpFeedUpdates,
  waitForAcpSessionIdle,
  waitForAcpSnapshot,
} from '#mocks/acp-feed';

type PromptHandler = AgentRequestHandlersByMethod['session/prompt'];
type AcpEngine = Awaited<ReturnType<typeof startAcpEngine>>;
type Outcomes = Map<string, RequestPermissionResponse['outcome']>;

const alwaysAllow = 'edit-always';
const allowOnce = 'edit-once';
const reject = 'edit-reject';
const requestPermission = 'session/request_permission';
const createElicitation = 'elicitation/create';
const alreadyAnswered = 'already answered';
const unrecognised = 'The Agent sent an unrecognised message';
const issueMessage = 'A few details for the new issue';
const cancelled = { outcome: { outcome: 'cancelled' } };

const exactOptions: RequestPermissionRequest['options'] = [
  { optionId: alwaysAllow, name: 'Always allow edits', kind: 'allow_always' },
  { optionId: allowOnce, name: 'Allow', kind: 'allow_once' },
  { optionId: reject, name: 'Reject', kind: 'reject_once' },
];
const issueSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', title: 'Title' },
    estimate: { type: 'integer', minimum: 1 },
  },
  required: ['title'],
} as const;
const permissionRequest = (
  sessionId: string,
  toolCallId: string,
): RequestPermissionRequest => ({
  sessionId,
  toolCall: { toolCallId, title: `Edit ${toolCallId}` },
  options: exactOptions,
});
const issueForm = (
  sessionId: string,
  message = issueMessage,
): CreateElicitationRequest => ({
  mode: 'form',
  sessionId,
  toolCallId: 'tool-a',
  message,
  requestedSchema: issueSchema,
});

const promptSession = (host: AcpEngine, sessionId: string): Promise<unknown> =>
  host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Edit both files' }],
  });
const startSession = async (
  agent: string,
  prompt: PromptHandler,
): Promise<{ host: AcpEngine; sessionId: string }> => {
  const host = await startAcpEngine({ prompt }, undefined, agent);
  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    agent,
  });
  await promptSession(host, sessionId);
  return { host, sessionId };
};
const waitForPermission = async (
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
const waitForElicitation = async (
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
const waitForTurnEnd = (
  host: AcpEngine,
  sessionId: string,
): Promise<SessionSnapshot> =>
  waitForAcpSnapshot(
    host,
    sessionId,
    (snapshot) => snapshot.activeTurnId === null,
  );
const readNotices = async (
  host: AcpEngine,
  sessionId: string,
): Promise<Notice[]> =>
  (
    await host.caller.feed.page({ sessionId, direction: 'tail', limit: 40 })
  ).rows.filter((row): row is Notice => row.sessionUpdate === 'notice');
const recordPermissionOutcomes =
  (outcomes: Outcomes, toolCallIds: readonly string[]): PromptHandler =>
  async ({ params, client }) => {
    await Promise.all(
      toolCallIds.map(async (toolCallId) => {
        const response = await client.request(
          requestPermission,
          permissionRequest(params.sessionId, toolCallId),
        );
        outcomes.set(toolCallId, response.outcome);
      }),
    );
    return { stopReason: 'end_turn' };
  };
const readPermissionOutcome = async (
  host: AcpEngine,
  sessionId: string,
  toolCallId: string,
): Promise<unknown> =>
  (
    await host.caller.feed.page({ sessionId, direction: 'tail', limit: 40 })
  ).rows.find(
    (row) =>
      row.sessionUpdate === 'tool_call_update' && row.toolCallId === toolCallId,
  )?._meta?.argo;
const recordElicitationResults =
  (
    results: Map<string, CreateElicitationResponse>,
    messages: readonly string[],
  ): PromptHandler =>
  async ({ params, client }) => {
    await Promise.all(
      messages.map(async (message) => {
        results.set(
          message,
          await client.request(
            createElicitation,
            issueForm(params.sessionId, message),
          ),
        );
      }),
    );
    return { stopReason: 'end_turn' };
  };

const requestWithdrawablePermission =
  (cancellationSignal: AbortSignal): PromptHandler =>
  async ({ params, client }) => {
    await client
      .request(
        requestPermission,
        permissionRequest(params.sessionId, 'tool-a'),
        { cancellationSignal },
      )
      .catch((): null => null);
    return new Promise(() => {});
  };

it.each(
  appFixtureAgentIds.flatMap((agent) =>
    (['Permission', 'Elicitation'] as const).map((kind) => ({ agent, kind })),
  ),
)(
  '$agent Stop cancels a pending $kind and ends its Turn',
  async ({ agent, kind }) => {
    const response = Promise.withResolvers<
      RequestPermissionResponse | CreateElicitationResponse
    >();
    const { host, sessionId } = await startSession(
      agent,
      async ({ params, client }) => {
        response.resolve(
          await (kind === 'Permission'
            ? client.request(
                requestPermission,
                permissionRequest(params.sessionId, 'tool-a'),
              )
            : client.request(createElicitation, issueForm(params.sessionId))),
        );
        return { stopReason: 'cancelled' };
      },
    );
    await (kind === 'Permission'
      ? waitForPermission(host, sessionId)
      : waitForElicitation(host, sessionId));
    await host.caller.session.cancel({ sessionId });
    expect(await response.promise).toEqual(
      kind === 'Permission' ? cancelled : { action: 'cancel' },
    );
    const snapshot = await waitForTurnEnd(host, sessionId);
    expect(snapshot.pendingPermission).toBeNull();
    expect(snapshot.pendingElicitation).toBeNull();
  },
);

describe.each(appFixtureAgentIds)('%s Permission requests', (agent) => {
  it('presents the exact options the Agent offered', async () => {
    const { host, sessionId } = await startSession(
      agent,
      recordPermissionOutcomes(new Map(), ['tool-a']),
    );
    expect(await waitForPermission(host, sessionId)).toEqual({
      requestId: expect.any(String),
      toolCallId: 'tool-a',
      title: 'Edit tool-a',
      options: exactOptions,
    });
  });

  it('settles only the answered request with its exact option while the prompt still runs', async () => {
    const outcomes: Outcomes = new Map();
    const { host, sessionId } = await startSession(
      agent,
      recordPermissionOutcomes(outcomes, ['tool-a', 'tool-b']),
    );
    const first = await waitForPermission(host, sessionId, 'tool-a');
    await host.caller.session.answerPermission({
      sessionId,
      requestId: first.requestId,
      optionId: alwaysAllow,
    });
    await waitForPermission(host, sessionId, 'tool-b');
    expect(outcomes).toEqual(
      new Map([['tool-a', { outcome: 'selected', optionId: alwaysAllow }]]),
    );
  });

  it.each([
    [alwaysAllow, 'Always allow edits', 'allow_always'],
    [reject, 'Reject', 'reject_once'],
  ])(
    'the Feed keeps the name and kind of the chosen %s option on its Tool call',
    async (optionId, name, kind) => {
      const { host, sessionId } = await startSession(agent, async (request) => {
        await sendAcpFeedUpdates(request, [
          { sessionUpdate: 'tool_call', toolCallId: 'tool-a', title: 'Edit' },
        ]);
        return recordPermissionOutcomes(new Map(), ['tool-a'])(request);
      });
      const pending = await waitForPermission(host, sessionId);
      await host.caller.session.answerPermission({
        sessionId,
        requestId: pending.requestId,
        optionId,
      });
      await waitForAcpSessionIdle(host, sessionId);
      expect(await readPermissionOutcome(host, sessionId, 'tool-a')).toEqual({
        permissionOutcome: { outcome: 'selected', optionId, name, kind },
      });
    },
  );

  it('an answer in one Session never settles a request in another', async () => {
    const outcomes: Outcomes = new Map();
    const { host, sessionId } = await startSession(
      agent,
      async ({ params, client }) => {
        const response = await client.request(
          requestPermission,
          permissionRequest(params.sessionId, `tool-${params.sessionId}`),
        );
        outcomes.set(params.sessionId, response.outcome);
        return { stopReason: 'end_turn' };
      },
    );
    const other = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });
    await promptSession(host, other.sessionId);
    const waiting = await waitForPermission(host, sessionId);
    const elsewhere = await waitForPermission(host, other.sessionId);
    await expect(
      host.caller.session.answerPermission({
        sessionId,
        requestId: elsewhere.requestId,
        optionId: allowOnce,
      }),
    ).rejects.toThrow(alreadyAnswered);
    expect(outcomes.size).toBe(0);
    expect(await waitForPermission(host, sessionId)).toEqual(waiting);
  });

  it('a duplicate answer is rejected without consuming the next request', async () => {
    const outcomes: Outcomes = new Map();
    const { host, sessionId } = await startSession(
      agent,
      recordPermissionOutcomes(outcomes, ['tool-a', 'tool-b']),
    );
    const first = await waitForPermission(host, sessionId, 'tool-a');
    const answer = {
      sessionId,
      requestId: first.requestId,
      optionId: allowOnce,
    };
    await host.caller.session.answerPermission(answer);
    await expect(host.caller.session.answerPermission(answer)).rejects.toThrow(
      alreadyAnswered,
    );
    await waitForPermission(host, sessionId, 'tool-b');
    expect(outcomes.has('tool-b')).toBe(false);
  });

  it('an option the Agent did not offer is refused and the request stays pending', async () => {
    const { host, sessionId } = await startSession(
      agent,
      recordPermissionOutcomes(new Map(), ['tool-a']),
    );
    const pending = await waitForPermission(host, sessionId);
    await expect(
      host.caller.session.answerPermission({
        sessionId,
        requestId: pending.requestId,
        optionId: 'allow_once',
      }),
    ).rejects.toThrow('did not offer');
    expect(await waitForPermission(host, sessionId)).toEqual(pending);
  });

  it.each([reject, allowOnce])(
    'feedback with %s is refused as undeliverable and the request stays pending',
    async (optionId) => {
      const outcomes: Outcomes = new Map();
      const { host, sessionId } = await startSession(
        agent,
        recordPermissionOutcomes(outcomes, ['tool-a']),
      );
      const pending = await waitForPermission(host, sessionId);
      await expect(
        host.caller.session.answerPermission({
          sessionId,
          requestId: pending.requestId,
          optionId,
          message: 'Use the cache instead',
        }),
      ).rejects.toThrow('does not support Permission feedback');
      expect(await waitForPermission(host, sessionId)).toEqual(pending);
      expect(outcomes.size).toBe(0);
    },
  );

  it('a request stays answerable after one App stops watching the Session', async () => {
    const outcomes: Outcomes = new Map();
    const { host, sessionId } = await startSession(
      agent,
      recordPermissionOutcomes(outcomes, ['tool-a']),
    );
    const pending = await waitForPermission(host, sessionId);
    const departingApp = host.createCaller();
    const watching = (
      await departingApp.feed.subscribe({ sessionId, after: null })
    )[Symbol.asyncIterator]();
    await watching.next();
    await watching.return?.();
    await host.createCaller().session.answerPermission({
      sessionId,
      requestId: pending.requestId,
      optionId: allowOnce,
    });
    await waitForAcpSessionIdle(host, sessionId);
    expect(outcomes.get('tool-a')).toEqual({
      outcome: 'selected',
      optionId: allowOnce,
    });
  });

  it('a request still pending when its Turn ends is cancelled and no longer answerable', async () => {
    const response = Promise.withResolvers<RequestPermissionResponse>();
    const { host, sessionId } = await startSession(
      agent,
      async ({ params, client }) => {
        void client
          .request(
            requestPermission,
            permissionRequest(params.sessionId, 'tool-a'),
          )
          .then(response.resolve, response.reject);
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { stopReason: 'end_turn' };
      },
    );
    const pending = await waitForPermission(host, sessionId);
    expect(await response.promise).toEqual(cancelled);
    expect(
      (await waitForTurnEnd(host, sessionId)).pendingPermission,
    ).toBeNull();
    await expect(
      host.caller.session.answerPermission({
        sessionId,
        requestId: pending.requestId,
        optionId: allowOnce,
      }),
    ).rejects.toThrow(alreadyAnswered);
  });

  it('closing the Session cancels its pending request', async () => {
    const response = Promise.withResolvers<RequestPermissionResponse>();
    const { host, sessionId } = await startSession(
      agent,
      async ({ params, client }) => {
        response.resolve(
          await client.request(
            requestPermission,
            permissionRequest(params.sessionId, 'tool-a'),
          ),
        );
        return new Promise(() => {});
      },
    );
    await waitForPermission(host, sessionId);
    await host.caller.session.close({ sessionId });
    expect(await response.promise).toEqual(cancelled);
  });

  it('a request the Agent withdraws is no longer answerable', async () => {
    const withdraw = new AbortController();
    const { host, sessionId } = await startSession(
      agent,
      requestWithdrawablePermission(withdraw.signal),
    );
    const pending = await waitForPermission(host, sessionId);
    withdraw.abort();
    await waitForAcpSnapshot(
      host,
      sessionId,
      (snapshot) =>
        snapshot.pendingPermission === null && snapshot.state === 'running',
    );
    await expect(
      host.caller.session.answerPermission({
        sessionId,
        requestId: pending.requestId,
        optionId: allowOnce,
      }),
    ).rejects.toThrow(alreadyAnswered);
  });

  it('a malformed request is cancelled and reported', async () => {
    const response = Promise.withResolvers<RequestPermissionResponse>();
    const { host, sessionId } = await startSession(
      agent,
      async ({ params, client }) => {
        response.resolve(
          await client.request(requestPermission, {
            ...permissionRequest(params.sessionId, 'tool-a'),
            options: [],
          }),
        );
        return new Promise(() => {});
      },
    );
    expect(await response.promise).toEqual(cancelled);
    await vi.waitFor(async () =>
      expect(await readNotices(host, sessionId)).toEqual([
        expect.objectContaining({ severity: 'warning', title: unrecognised }),
      ]),
    );
  });
});

describe.each(appFixtureAgentIds)('%s Elicitations', (agent) => {
  it('presents a form Elicitation with its exact schema', async () => {
    const { host, sessionId } = await startSession(
      agent,
      recordElicitationResults(new Map(), [issueMessage]),
    );
    expect(await waitForElicitation(host, sessionId)).toEqual({
      requestId: expect.any(String),
      mode: 'form',
      message: issueMessage,
      toolCallId: 'tool-a',
      requestedSchema: issueSchema,
    });
  });

  it('delivers the accepted form content to the exact Elicitation', async () => {
    const results = new Map<string, CreateElicitationResponse>();
    const { host, sessionId } = await startSession(
      agent,
      recordElicitationResults(results, [issueMessage]),
    );
    const pending = await waitForElicitation(host, sessionId);
    await host.caller.session.answerElicitation({
      sessionId,
      requestId: pending.requestId,
      action: 'accept',
      content: { title: 'Drafts vanish after a reconnect', estimate: 3 },
    });
    await waitForTurnEnd(host, sessionId);
    expect(results.get(issueMessage)).toEqual({
      action: 'accept',
      content: { title: 'Drafts vanish after a reconnect', estimate: 3 },
    });
  });

  it('refuses content that does not match the form and keeps it pending', async () => {
    const { host, sessionId } = await startSession(
      agent,
      recordElicitationResults(new Map(), [issueMessage]),
    );
    const pending = await waitForElicitation(host, sessionId);
    await expect(
      host.caller.session.answerElicitation({
        sessionId,
        requestId: pending.requestId,
        action: 'accept',
        content: { title: 7 },
      }),
    ).rejects.toThrow('does not match');
    expect(await waitForElicitation(host, sessionId)).toEqual(pending);
  });

  it('queues concurrent Elicitations and settles each with its own answer', async () => {
    const results = new Map<string, CreateElicitationResponse>();
    const { host, sessionId } = await startSession(
      agent,
      recordElicitationResults(results, ['First', 'Second']),
    );
    const first = await waitForElicitation(host, sessionId, 'First');
    await host.caller.session.answerElicitation({
      sessionId,
      requestId: first.requestId,
      action: 'decline',
    });
    await waitForElicitation(host, sessionId, 'Second');
    expect(results).toEqual(new Map([['First', { action: 'decline' }]]));
  });

  it('a duplicate answer is rejected without consuming the next Elicitation', async () => {
    const results = new Map<string, CreateElicitationResponse>();
    const { host, sessionId } = await startSession(
      agent,
      recordElicitationResults(results, ['First', 'Second']),
    );
    const first = await waitForElicitation(host, sessionId, 'First');
    const answer = {
      sessionId,
      requestId: first.requestId,
      action: 'decline' as const,
    };
    await host.caller.session.answerElicitation(answer);
    await expect(host.caller.session.answerElicitation(answer)).rejects.toThrow(
      alreadyAnswered,
    );
    await waitForElicitation(host, sessionId, 'Second');
    expect(results.has('Second')).toBe(false);
  });

  it('a URL Elicitation is cancelled without being presented', async () => {
    const answered = Promise.withResolvers<CreateElicitationResponse>();
    const { host, sessionId } = await startSession(
      agent,
      async ({ params, client }) => {
        answered.resolve(
          await client.request(createElicitation, {
            mode: 'url',
            sessionId: params.sessionId,
            elicitationId: 'sign-in',
            url: 'https://example.com/sign-in',
            message: 'Sign in',
          }),
        );
        return { stopReason: 'end_turn' };
      },
    );
    expect(await answered.promise).toEqual({ action: 'cancel' });
    expect(
      (await waitForTurnEnd(host, sessionId)).pendingElicitation,
    ).toBeNull();
  });

  it('an Elicitation in an unknown mode is cancelled and reported', async () => {
    const answered = Promise.withResolvers<CreateElicitationResponse>();
    const { host, sessionId } = await startSession(
      agent,
      async ({ params, client }) => {
        answered.resolve(
          await client.request(createElicitation, {
            mode: 'voice',
            sessionId: params.sessionId,
            message: 'Say it',
          }),
        );
        return new Promise(() => {});
      },
    );
    expect(await answered.promise).toEqual({ action: 'cancel' });
    await vi.waitFor(async () =>
      expect(await readNotices(host, sessionId)).toEqual([
        expect.objectContaining({
          title: unrecognised,
          description: 'Unknown Elicitation mode voice',
        }),
      ]),
    );
  });
});
