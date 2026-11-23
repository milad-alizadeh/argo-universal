import type {
  CreateElicitationResponse,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import {
  askToLeavePlanMode,
  leavePlanMode,
  leavePlanModeOptions,
  leavePlanModeSteps,
  withMode,
} from '@repo/mocks/agent/plan-mode-scenario';
import { expect, it, describe, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { closeTestSession } from '#mocks/close-session';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import {
  permissionSteps,
  elicitationSteps,
  answerLeavePlanMode,
  readToolCallUpdate,
  readNotices,
} from './acp-requests-scenarios.test.mocks';
import {
  allowOnce,
  alreadyAnswered,
  issueMessage,
  cancelled,
  promptSession,
  waitForPermission,
  waitForElicitation,
  waitForTurnEnd,
  type Outcomes,
  alwaysAllow,
  editToolTitle,
  exactOptions,
  startSession,
  reject,
  unrecognised,
  issueSchema,
  createElicitation,
  unknownElicitationId,
} from './acp-requests-shared.test.mocks';

type Kind = 'Permission' | 'Elicitation';

/** The first test in a cold CI worker also pays for starting the Engine and its Plugin host. */
const coldEngineTimeoutMs = 10_000;

const stepsFor = (
  kind: Kind,
  permission: RequestPermissionResponse[],
  elicitation: CreateElicitationResponse[],
): ReturnType<typeof permissionSteps> =>
  kind === 'Permission'
    ? permissionSteps(permission, ['tool-a'])
    : elicitationSteps(elicitation, [issueMessage]);

const responseFor = (
  kind: Kind,
  permission: RequestPermissionResponse[],
  elicitation: CreateElicitationResponse[],
): RequestPermissionResponse | CreateElicitationResponse | undefined =>
  kind === 'Permission' ? permission[0] : elicitation[0];

const cancelledOutcome = (
  kind: Kind,
): typeof cancelled | { action: 'cancel' } =>
  kind === 'Permission' ? cancelled : { action: 'cancel' };

it.each(
  appFixtureAgentIds.flatMap((agent) =>
    (['Permission', 'Elicitation'] as const).map((kind) => ({ agent, kind })),
  ),
)(
  '$agent Stop cancels a pending $kind, refuses late answers and ends its Turn',
  async ({ agent, kind }) => {
    const permissionResponses: RequestPermissionResponse[] = [];
    const elicitationResponses: CreateElicitationResponse[] = [];

    const host = await startAcpEngine(
      {
        steps: [
          ...stepsFor(kind, permissionResponses, elicitationResponses),
          { type: 'wait-for-cancel' },
        ],
      },
      undefined,
      agent,
    );

    const { sessionId } = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    await promptSession(host, sessionId);

    const pending = await (kind === 'Permission'
      ? waitForPermission(host, sessionId)
      : waitForElicitation(host, sessionId));

    await host.caller.session.cancel({ sessionId });
    await waitForTurnEnd(host, sessionId);
    expect(
      responseFor(kind, permissionResponses, elicitationResponses),
    ).toEqual(cancelledOutcome(kind));
    await expect(
      kind === 'Permission'
        ? host.caller.session.answerPermission({
            sessionId,
            requestId: pending.requestId,
            optionId: allowOnce,
          })
        : host.caller.session.answerElicitation({
            sessionId,
            requestId: pending.requestId,
            action: 'decline',
          }),
    ).rejects.toThrow(alreadyAnswered);
    const snapshot = await waitForTurnEnd(host, sessionId);
    expect(snapshot.pendingPermission).toBeNull();
    expect(snapshot.pendingElicitation).toBeNull();
  },
  coldEngineTimeoutMs,
);

describe.each(appFixtureAgentIds)('%s Permission requests', (agent) => {
  it('presents the exact options the Agent offered', async () => {
    const { host, sessionId } = await startSession(
      agent,
      permissionSteps([], ['tool-a']),
    );

    expect(await waitForPermission(host, sessionId)).toEqual({
      requestId: expect.any(String),
      toolCallId: 'tool-a',
      title: editToolTitle,
      options: exactOptions,
    });
  });

  it('presents a request to leave plan mode as a Permission request with all its options', async () => {
    const { host, sessionId } = await startSession(agent, askToLeavePlanMode());

    expect(await waitForPermission(host, sessionId)).toEqual({
      requestId: expect.any(String),
      toolCallId: leavePlanMode.toolCallId,
      title: leavePlanMode.title,
      plan: leavePlanMode.rawInput.plan,
      options: leavePlanModeOptions,
    });
  });

  it('sends only the chosen option when the user keeps planning', async () => {
    const outcomes: Outcomes = [];

    const { host, sessionId } = await startSession(
      agent,
      askToLeavePlanMode(outcomes),
    );

    await answerLeavePlanMode(host, sessionId, 'reject');
    expect(outcomes).toEqual([
      { outcome: { outcome: 'selected', optionId: 'reject' } },
    ]);
  });

  it('shows code mode once the user approves the plan', async () => {
    const host = await startAcpEngine(
      { steps: leavePlanModeSteps, configOptions: withMode('plan') },
      undefined,
      agent,
    );

    const { sessionId } = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    await promptSession(host, sessionId);
    await answerLeavePlanMode(host, sessionId, 'exit-plan-default');
    expect(
      (await waitForTurnEnd(host, sessionId)).configOptions,
    ).toContainEqual(
      expect.objectContaining({ configId: 'mode', currentValue: 'code' }),
    );
  });

  it('settles only the answered request with its exact option while the prompt still runs', async () => {
    const outcomes: Outcomes = [];

    const { host, sessionId } = await startSession(
      agent,
      permissionSteps(outcomes, ['tool-a', 'tool-b']),
    );

    const first = await waitForPermission(host, sessionId, 'tool-a');
    await host.caller.session.answerPermission({
      sessionId,
      requestId: first.requestId,
      optionId: alwaysAllow,
    });
    await waitForPermission(host, sessionId, 'tool-b');
    expect(outcomes).toEqual([
      { outcome: { outcome: 'selected', optionId: alwaysAllow } },
    ]);
  });
});

describe.each(appFixtureAgentIds)('%s Permission request answers', (agent) => {
  it.each([
    [alwaysAllow, 'Always allow edits', 'allow_always'],
    [reject, 'Reject', 'reject_once'],
  ])(
    'the Feed keeps the name and kind of the chosen %s option on its Tool call',
    async (optionId, name, kind) => {
      const { host, sessionId } = await startSession(agent, [
        {
          type: 'update',
          update: {
            sessionUpdate: 'tool_call',
            toolCallId: 'tool-a',
            title: 'Edit',
          },
        },
        ...permissionSteps([], ['tool-a']),
      ]);

      const pending = await waitForPermission(host, sessionId);
      await host.caller.session.answerPermission({
        sessionId,
        requestId: pending.requestId,
        optionId,
      });
      await waitForAcpSessionIdle(host, sessionId);
      expect(
        (await readToolCallUpdate(host, sessionId, 'tool-a'))?._meta?.argo,
      ).toEqual({
        permissionOutcome: { outcome: 'selected', optionId, name, kind },
      });
    },
  );

  it('an answer in one Session never settles a request in another', async () => {
    const outcomes: Outcomes = [];

    const { host, sessionId } = await startSession(
      agent,
      permissionSteps(outcomes, ['tool-a']),
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
    expect(outcomes).toHaveLength(0);
    expect(await waitForPermission(host, sessionId)).toEqual(waiting);
  });

  it('a duplicate answer is rejected without consuming the next request', async () => {
    const outcomes: Outcomes = [];

    const { host, sessionId } = await startSession(
      agent,
      permissionSteps(outcomes, ['tool-a', 'tool-b']),
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
    expect(outcomes).toHaveLength(1);
  });
});

describe.each(appFixtureAgentIds)('%s pending Permission requests', (agent) => {
  it('an option the Agent did not offer is refused and the request stays pending', async () => {
    const { host, sessionId } = await startSession(
      agent,
      permissionSteps([], ['tool-a']),
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

  it('a request stays answerable after one App stops watching the Session', async () => {
    const outcomes: Outcomes = [];

    const { host, sessionId } = await startSession(
      agent,
      permissionSteps(outcomes, ['tool-a']),
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
    expect(outcomes[0]?.outcome).toEqual({
      outcome: 'selected',
      optionId: allowOnce,
    });
  });

  it('a request still pending when its Turn ends is cancelled and no longer answerable', async () => {
    const responses: RequestPermissionResponse[] = [];
    const finish = Promise.withResolvers<void>();

    const { host, sessionId } = await startSession(agent, [
      {
        type: 'update',
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: 'tool-a',
          title: editToolTitle,
        },
      },
      {
        type: 'permission',
        request: {
          toolCall: { toolCallId: 'tool-a', title: editToolTitle },
          options: exactOptions,
        },
        responses,
        detached: true,
      },
      { type: 'gate', waitFor: finish.promise },
    ]);

    const pending = await waitForPermission(host, sessionId);
    finish.resolve();
    await vi.waitFor(() => expect(responses[0]).toEqual(cancelled));
    expect(
      (await waitForTurnEnd(host, sessionId)).pendingPermission,
    ).toBeNull();
    expect(
      (await readToolCallUpdate(host, sessionId, 'tool-a'))?._meta?.argo,
    ).toEqual({
      permissionOutcome: { outcome: 'cancelled' },
    });
    await expect(
      host.caller.session.answerPermission({
        sessionId,
        requestId: pending.requestId,
        optionId: allowOnce,
      }),
    ).rejects.toThrow(alreadyAnswered);
  });
});

describe.each(appFixtureAgentIds)(
  '%s cancelled Permission requests',
  (agent) => {
    it('closing the Session cancels its pending request', async () => {
      const responses: RequestPermissionResponse[] = [];

      const { host, sessionId } = await startSession(agent, [
        {
          type: 'update',
          update: {
            sessionUpdate: 'tool_call',
            toolCallId: 'tool-a',
            title: editToolTitle,
          },
        },
        ...permissionSteps(responses, ['tool-a']),
        { type: 'hold' },
      ]);

      await waitForPermission(host, sessionId);
      await closeTestSession(host, { sessionId });
      await vi.waitFor(() => expect(responses[0]).toEqual(cancelled));
      expect(
        (await readToolCallUpdate(host, sessionId, 'tool-a'))?._meta?.argo,
      ).toEqual({
        permissionOutcome: { outcome: 'cancelled' },
      });
    });

    it('a request the Agent withdraws is no longer answerable', async () => {
      const withdraw = new AbortController();

      const { host, sessionId } = await startSession(agent, [
        {
          type: 'permission',
          request: {
            toolCall: { toolCallId: 'tool-a', title: editToolTitle },
            options: exactOptions,
          },
          signal: withdraw.signal,
          detached: true,
        },
        { type: 'hold' },
      ]);

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
      const responses: RequestPermissionResponse[] = [];

      const { host, sessionId } = await startSession(agent, [
        {
          type: 'permission',
          request: {
            toolCall: { toolCallId: 'tool-a', title: editToolTitle },
            options: [],
          },
          responses,
        },
        { type: 'hold' },
      ]);

      await vi.waitFor(() => expect(responses[0]).toEqual(cancelled));
      await vi.waitFor(async () =>
        expect(await readNotices(host, sessionId)).toEqual([
          expect.objectContaining({ severity: 'warning', title: unrecognised }),
        ]),
      );
    });
  },
);

describe.each(appFixtureAgentIds)('%s Elicitations', (agent) => {
  it('presents a form Elicitation with its exact schema', async () => {
    const { host, sessionId } = await startSession(
      agent,
      elicitationSteps([], [issueMessage]),
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
    const results: CreateElicitationResponse[] = [];

    const { host, sessionId } = await startSession(
      agent,
      elicitationSteps(results, [issueMessage]),
    );

    const pending = await waitForElicitation(host, sessionId);
    await host.caller.session.answerElicitation({
      sessionId,
      requestId: pending.requestId,
      action: 'accept',
      content: { title: 'Drafts vanish after a reconnect', estimate: 3 },
    });
    await waitForTurnEnd(host, sessionId);
    expect(results[0]).toEqual({
      action: 'accept',
      content: { title: 'Drafts vanish after a reconnect', estimate: 3 },
    });
  });

  it('refuses content that does not match the form and keeps it pending', async () => {
    const { host, sessionId } = await startSession(
      agent,
      elicitationSteps([], [issueMessage]),
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
    const results: CreateElicitationResponse[] = [];

    const { host, sessionId } = await startSession(
      agent,
      elicitationSteps(results, ['First', 'Second']),
    );

    const first = await waitForElicitation(host, sessionId, 'First');
    await host.caller.session.answerElicitation({
      sessionId,
      requestId: first.requestId,
      action: 'decline',
    });
    await waitForElicitation(host, sessionId, 'Second');
    expect(results).toEqual([{ action: 'decline' }]);
  });

  it('a duplicate answer is rejected without consuming the next Elicitation', async () => {
    const results: CreateElicitationResponse[] = [];

    const { host, sessionId } = await startSession(
      agent,
      elicitationSteps(results, ['First', 'Second']),
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
    expect(results).toHaveLength(1);
  });

  it('a URL Elicitation is cancelled without being presented', async () => {
    const responses: CreateElicitationResponse[] = [];

    const { host, sessionId } = await startSession(agent, [
      {
        type: 'elicitation',
        request: {
          mode: 'url',
          elicitationId: 'sign-in',
          url: 'https://example.com/sign-in',
          message: 'Sign in',
        },
        responses,
      },
    ]);

    await vi.waitFor(() => expect(responses[0]).toEqual({ action: 'cancel' }));
    expect(
      (await waitForTurnEnd(host, sessionId)).pendingElicitation,
    ).toBeNull();
  });

  it('an Elicitation in an unknown mode is cancelled and reported', async () => {
    const { host, sessionId } = await startSession(agent, [
      {
        type: 'raw',
        frame: JSON.stringify({
          jsonrpc: '2.0',
          id: unknownElicitationId,
          method: createElicitation,
          params: { mode: 'voice', sessionId: '$sessionId', message: 'Say it' },
        }),
      },
      { type: 'hold' },
    ]);

    const process = requireScriptedProcessAt(host.agent.processes);
    let reply = await process.receive();

    while (!('id' in reply) || reply.id !== unknownElicitationId)
      reply = await process.receive();
    expect(reply).toMatchObject({
      id: unknownElicitationId,
      result: { action: 'cancel' },
    });
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
