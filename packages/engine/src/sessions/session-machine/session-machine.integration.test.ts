import type {
  RequestPermissionResponse,
  CreateElicitationResponse,
  NewSessionRequest,
} from '@agentclientprotocol/sdk';
import { permissionOptions } from '@repo/contracts';
import type { FeedSubscribeOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot, waitForAcpSessionIdle } from '#mocks/acp-feed';
import { plain } from '#mocks/plain-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import {
  promptInput,
  fileQuestion,
  permissionTool,
  nextPermissionTool,
  optionId,
  mixedQuestions,
  snapshotEvent,
  rowUpsertEvent,
} from './session-machine.test.mocks';

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

function requireValue<T>(value: T | null, message: string): T {
  if (!value) throw new Error(message);

  return value;
}

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

  const firstPermission = requireValue(
    first.pendingPermission,
    'No first Permission',
  );

  await host.caller.session.answerPermission({
    ...created,
    requestId: firstPermission.requestId,
    optionId,
  });

  const second = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) => snapshot.pendingPermission?.toolCallId === nextPermissionTool,
  );

  const secondPermission = requireValue(
    second.pendingPermission,
    'No second Permission',
  );

  await host.caller.session.answerPermission({
    ...created,
    requestId: secondPermission.requestId,
    optionId,
  });

  const question = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) => snapshot.pendingPermission === null,
  );

  expect(question.state).toBe('requires_action');

  const elicitation = requireValue(
    question.pendingElicitation,
    'No Elicitation',
  );

  await host.caller.session.answerElicitation({
    ...created,
    requestId: elicitation.requestId,
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
      requestId: elicitation.requestId,
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
    state: 'idle',
    activeTurnId: null,
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
    await plain(host.caller.feed.subscribe({ ...created, after: null }))
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

function isRunningSnapshot(event: FeedSubscribeOutput): boolean {
  return event.type === snapshotEvent && event.snapshot.state === 'running';
}

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
    await plain(
      host.caller.feed.subscribe({
        ...created,
        after: null,
      }),
    )
  )[Symbol.asyncIterator]();

  expect((await updates.next()).value).toMatchObject({
    type: snapshotEvent,
    snapshot: { maxRevision: 0 },
  });
  ready.resolve();
  await prompting;

  type Update = Awaited<ReturnType<typeof updates.next>>['value'];

  async function nextRunningSnapshot(): Promise<Update> {
    let event = (await updates.next()).value;

    while (event && !isRunningSnapshot(event))
      event = (await updates.next()).value;

    return event;
  }

  async function nextRow(): Promise<Update> {
    let row = (await updates.next()).value;

    while (row && row.type !== rowUpsertEvent)
      row = (await updates.next()).value;

    return row;
  }

  const event = await nextRunningSnapshot();
  expect(event).toMatchObject({
    type: snapshotEvent,
    snapshot: { state: 'running', maxRevision: 1 },
  });
  const row = await nextRow();
  expect(row).toMatchObject({
    type: rowUpsertEvent,
    row: { sessionUpdate: 'user_message' },
  });
  await updates.return?.();
});
