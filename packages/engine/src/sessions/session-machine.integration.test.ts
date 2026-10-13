import type {
  NewSessionRequest,
  ResumeSessionRequest,
  RequestPermissionResponse,
  CreateElicitationResponse,
} from '@agentclientprotocol/sdk';
import { permissionOptions, type FeedSubscribeOutput } from '@repo/contracts';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const fileQuestion = 'Which file?';
const snapshotEvent = 'snapshot';
const permissionTool = 'tool-1';
const nextPermissionTool = 'tool-2';
const optionId = 'allow_once';
const promptInput = [{ type: 'text' as const, text: 'Hello' }];
const rowUpsertEvent = 'row.upsert';

const mixedQuestions = (
  permissions: RequestPermissionResponse[],
  elicitations: CreateElicitationResponse[],
): ScriptedScenario => ({
  steps: [
    {
      type: 'parallel',
      steps: [
        ...[permissionTool, nextPermissionTool].map((toolCallId) => ({
          type: 'permission' as const,
          request: {
            toolCall: { toolCallId, title: 'Read a file' },
            options: permissionOptions,
          },
          responses: permissions,
        })),
        {
          type: 'elicitation',
          request: {
            mode: 'form',
            message: fileQuestion,
            requestedSchema: {
              type: 'object',
              properties: { file: { type: 'string' } },
            },
          },
          responses: elicitations,
        },
      ],
    },
    { type: 'hold' },
  ],
});

it('rejected ACP requests publish warning Notices while the Turn continues accepting content', async () => {
  const host = await startAcpEngine({
    steps: [
      ...['voice', 'captcha'].map((mode) => ({
        type: 'raw' as const,
        frame: JSON.stringify({
          jsonrpc: '2.0',
          id: mode,
          method: 'elicitation/create',
          params: { mode, sessionId: '$sessionId', message: 'Unsupported' },
        }),
      })),
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'Still accepting content' },
        },
      },
      { type: 'hold' },
    ],
  });
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({ ...created, prompt: promptInput });
  await expect
    .poll(async () => {
      const page = await host.caller.feed.page({
        ...created,
        direction: 'tail',
      });
      return page.rows.filter((row) => row.sessionUpdate === 'notice');
    })
    .toMatchObject([
      {
        severity: 'warning',
        title: 'The Agent sent an unrecognised message',
        description: 'Unknown Elicitation mode voice',
      },
      {
        severity: 'warning',
        title: 'The Agent sent an unrecognised message',
        description: 'Unknown Elicitation mode captcha',
      },
    ]);
  expect(
    await waitForAcpSnapshot(host, created.sessionId, () => true),
  ).toMatchObject({ state: 'running', usage: null });
  await expect
    .poll(async () =>
      (
        await host.caller.feed.page({ ...created, direction: 'tail' })
      ).rows.filter((row) => row.sessionUpdate === 'agent_message'),
    )
    .toMatchObject([{ content: [{ text: 'Still accepting content' }] }]);
});

it('answers only the head Permission while concurrent Elicitation and other Permissions remain visible', async () => {
  const permissions: RequestPermissionResponse[] = [];
  const elicitations: CreateElicitationResponse[] = [];
  const host = await startAcpEngine(mixedQuestions(permissions, elicitations));
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({ ...created, prompt: promptInput });
  const first = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) =>
      snapshot.pendingPermission !== null &&
      snapshot.pendingElicitation !== null,
  );
  expect(first).toMatchObject({
    state: 'requires_action',
    pendingPermission: {
      toolCallId: permissionTool,
      title: 'Read a file',
      options: permissionOptions,
    },
    pendingElicitation: { message: fileQuestion },
  });
  await expect(
    host.caller.session.answerPermission({
      ...created,
      requestId: 'not-the-head',
      optionId,
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  if (!first.pendingPermission) throw new Error('No first Permission');
  await host.caller.session.answerPermission({
    ...created,
    requestId: first.pendingPermission.requestId,
    optionId,
  });
  const second = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) => snapshot.pendingPermission?.toolCallId === nextPermissionTool,
  );
  if (!second.pendingPermission) throw new Error('No second Permission');
  await host.caller.session.answerPermission({
    ...created,
    requestId: second.pendingPermission.requestId,
    optionId,
  });
  const question = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) => snapshot.pendingPermission === null,
  );
  expect(question.state).toBe('requires_action');
  if (!question.pendingElicitation) throw new Error('No Elicitation');
  await host.caller.session.answerElicitation({
    ...created,
    requestId: question.pendingElicitation.requestId,
    action: 'accept',
    content: { file: 'README.md' },
  });
  await expect
    .poll(() => elicitations)
    .toEqual([{ action: 'accept', content: { file: 'README.md' } }]);
  expect(
    await waitForAcpSnapshot(
      host,
      created.sessionId,
      (snapshot) => snapshot.pendingElicitation === null,
    ),
  ).toMatchObject({ state: 'running', pendingPermission: null });
  await expect(
    host.caller.session.answerElicitation({
      ...created,
      requestId: question.pendingElicitation.requestId,
      action: 'decline',
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  expect(permissions).toEqual([
    { outcome: { outcome: 'selected', optionId } },
    { outcome: { outcome: 'selected', optionId } },
  ]);
});

it('cancellation settles both question queues while its prompt waits for Agent completion', async () => {
  const permissions: RequestPermissionResponse[] = [];
  const elicitations: CreateElicitationResponse[] = [];
  const completion = Promise.withResolvers<void>();
  const scenario = mixedQuestions(permissions, elicitations);
  const host = await startAcpEngine({
    ...scenario,
    steps: [
      ...scenario.steps.slice(0, -1),
      { type: 'gate', waitFor: completion.promise },
    ],
  });
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({ ...created, prompt: promptInput });
  await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) =>
      snapshot.pendingPermission !== null &&
      snapshot.pendingElicitation !== null,
  );
  await host.caller.session.cancel(created);
  await expect
    .poll(() => ({ permissions, elicitations }))
    .toEqual({
      permissions: [
        { outcome: { outcome: 'cancelled' } },
        { outcome: { outcome: 'cancelled' } },
      ],
      elicitations: [{ action: 'cancel' }],
    });
  expect(
    await waitForAcpSnapshot(
      host,
      created.sessionId,
      (snapshot) =>
        snapshot.pendingPermission === null &&
        snapshot.pendingElicitation === null,
    ),
  ).toMatchObject({
    state: 'running',
    activeTurnId: expect.any(String),
    pendingPlanProposal: null,
  });
  completion.resolve();
  await waitForAcpSessionIdle(host, created.sessionId);
  expect(
    await waitForAcpSnapshot(host, created.sessionId, () => true),
  ).toMatchObject({ activeTurnId: null });
});

it('streams Session snapshots only when projected configuration changes', async () => {
  const host = await startAcpEngine({ steps: [{ type: 'hold' }] });
  const created = await host.caller.session.new(emptySessionInput);
  const updates = (
    await host.caller.feed.subscribe({ ...created, after: null })
  )[Symbol.asyncIterator]();
  expect((await updates.next()).value).toMatchObject({
    type: snapshotEvent,
    snapshot: { state: 'idle', maxRevision: 0 },
  });
  const process = requireScriptedProcessAt(host.agent.processes);
  const option = {
    id: 'fast',
    name: 'Fast',
    type: 'boolean' as const,
    currentValue: false,
  };
  await process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'config_option_update',
          configOptions: [option],
        },
      },
    ],
    'owned-1',
  );
  expect((await updates.next()).value).toMatchObject({
    type: snapshotEvent,
    snapshot: { configOptions: [{ configId: 'fast', currentValue: false }] },
  });
  await process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'config_option_update',
          configOptions: [option],
        },
      },
      {
        type: 'update',
        update: {
          sessionUpdate: 'config_option_update',
          configOptions: [{ ...option, currentValue: true }],
        },
      },
    ],
    'owned-1',
  );
  expect((await updates.next()).value).toMatchObject({
    type: snapshotEvent,
    snapshot: { configOptions: [{ configId: 'fast', currentValue: true }] },
  });
  await host.caller.session.prompt({ ...created, prompt: promptInput });
  expect((await updates.next()).value).toMatchObject({
    type: snapshotEvent,
    snapshot: {
      state: 'running',
      activeTurnId: expect.any(String),
      maxRevision: 1,
    },
  });
  await updates.return?.();
  expect(await updates.next()).toMatchObject({ done: true });
});

it('keeps its Feed subscriber through resumed Agent output and three crashes before terminal closure', async () => {
  const openings: NewSessionRequest[] = [];
  const resumes: ResumeSessionRequest[] = [];
  const host = await startAcpEngine({
    steps: [
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          messageId: 'after-recovery',
          content: { type: 'text', text: 'After recovery' },
        },
      },
      { type: 'wait-for-cancel' },
    ],
    responses: {
      'session/new': [{ requests: openings }],
      'session/resume': [{ requests: resumes }],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  const updates = (
    await host.caller.feed.subscribe({ ...created, after: null })
  )[Symbol.asyncIterator]();
  await updates.next();
  const streamed: FeedSubscribeOutput[] = [];
  for (const index of [0, 1, 2]) {
    requireScriptedProcessAt(host.agent.processes, index).disconnect();
    if (index === 2) continue;
    await expect
      .poll(() => host.agent.processes.length, { timeout: 10_000 })
      .toBe(index + 2);
    await waitForAcpSessionIdle(host, created.sessionId);
    if (index !== 0) continue;
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Continue after recovery' }],
    });
    while (true) {
      const next = await updates.next();
      if (next.done) throw new Error('Feed closed before recovered output');
      const event = next.value;
      streamed.push(event);
      if (
        event.type === rowUpsertEvent &&
        event.row.sessionUpdate === 'agent_message'
      )
        break;
    }
  }
  for await (const event of {
    [Symbol.asyncIterator]: (): AsyncIterator<FeedSubscribeOutput> => updates,
  })
    streamed.push(event);
  expect(streamed.at(-1)).toEqual({
    type: 'closed',
    failure: 'The Agent stopped three times in ten minutes',
  });
  expect(
    streamed.filter(
      (event) =>
        event.type === rowUpsertEvent &&
        event.row.sessionUpdate === 'agent_message' &&
        event.row.state === 'open',
    ),
  ).toEqual([
    expect.objectContaining({
      row: expect.objectContaining({
        messageId: 'after-recovery',
        content: [{ type: 'text', text: 'After recovery' }],
      }),
    }),
  ]);
  expect(openings).toHaveLength(1);
  expect(resumes.map((resume) => resume.sessionId)).toEqual([
    'owned-1',
    'owned-1',
  ]);
  expect(
    (
      await host.caller.feed.page({ ...created, direction: 'tail' })
    ).rows.filter((row) => row.sessionUpdate === 'notice'),
  ).toHaveLength(4);
}, 15_000);

it('attaches live Feed updates when a subscription starts while the Session opens', async () => {
  const opening = Promise.withResolvers<NewSessionRequest>();
  const ready = Promise.withResolvers<void>();
  const host = await startAcpEngine({
    steps: [{ type: 'hold' }],
    responses: {
      'session/new': [{ received: opening, waitFor: ready.promise }],
    },
  });
  const created = { sessionId: 'session-1' };
  const prompting = host.caller.session.prompt({
    ...created,
    prompt: promptInput,
  });
  await opening.promise;
  const updates = (
    await host.caller.feed.subscribe({
      ...created,
      after: null,
    })
  )[Symbol.asyncIterator]();
  expect((await updates.next()).value).toMatchObject({
    type: snapshotEvent,
    snapshot: { maxRevision: 0 },
  });
  ready.resolve();
  await prompting;
  let event = (await updates.next()).value;
  while (
    event &&
    (event.type !== snapshotEvent || event.snapshot.state !== 'running')
  )
    event = (await updates.next()).value;
  expect(event).toMatchObject({
    type: snapshotEvent,
    snapshot: { state: 'running', maxRevision: 1 },
  });
  let row = (await updates.next()).value;
  while (row && row.type !== rowUpsertEvent) row = (await updates.next()).value;
  expect(row).toMatchObject({
    type: rowUpsertEvent,
    row: { sessionUpdate: 'user_message' },
  });
  await updates.return?.();
});
