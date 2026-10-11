import type {
  NewSessionRequest,
  ResumeSessionRequest,
  RequestPermissionResponse,
  CreateElicitationResponse,
} from '@agentclientprotocol/sdk';
import { agentAdapters, type AgentEvent } from '@repo/agents';
import { permissionOptions, type FeedSubscribeOutput } from '@repo/contracts';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import { afterAll, expect, it } from 'vitest';
import { createActor, type SnapshotFrom, getNextSnapshot } from 'xstate';
import {
  type GraphEventFromLogic,
  getShortestPaths,
  getAdjacencyMap,
} from 'xstate/graph';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { openTestDatabase } from '#mocks/database';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { openSessionsMachine } from './open-sessions-machine';
import type { SessionData } from './session-data';
import { sessionMachine } from './session-machine';

afterAll((): void => remove());

const firstPrompt = {
  type: 'session.prompt' as const,
  turnId: 'turn-1',
  content: [],
};
const callbackFailedEvent = 'xstate.error.actor.vendorSession';
const agentUsageEvent = 'agent.usage';
const agentFeedEvent = 'agent.feed';
const sessionPromptEvent = 'session.prompt';
const agentTurnEndedEvent = 'agent.turnEnded';
const permissionRequestedEvent = 'agent.permissionRequested';
const elicitationRequestedEvent = 'agent.elicitationRequested';
const fileQuestion = 'Which file?';
const answerPermissionEvent = 'session.answerPermission';
const answerElicitationEvent = 'session.answerElicitation';
const sessionCancelEvent = 'session.cancel';
const sessionCloseEvent = 'session.close';
const sessionSetConfigEvent = 'session.setConfigOption';
const configOptionsChangedEvent = 'agent.configOptionsChanged';
const requestModel = 'request-model';
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

const { database, directory: runtimeDirectory, remove } = openTestDatabase();
const checkoutCreatedEvent = 'xstate.done.actor.createCheckout';
const checkoutCreateFailedEvent = 'xstate.error.actor.createCheckout';
const checkoutDiscardedEvent = 'xstate.done.actor.discardCheckout';
const checkoutDiscardFailedEvent = 'xstate.error.actor.discardCheckout';
const sessionLoadedEvent = 'xstate.done.actor.loadSession';
const sessionLoadFailedEvent = 'xstate.error.actor.loadSession';
const feedFailedEvent = 'xstate.error.actor.feed';
const feedFlushedEvent = 'xstate.done.actor.feed';
const checkoutDelayEvent = 'xstate.after.checkoutLimit.session.creating';
const cancelDelayEvent =
  'xstate.after.cancelLimit.session.open.live.cancelling';
const agentStopDelayEvent = 'xstate.after.agentStopLimit.session.open.draining';
const feedFailureStopDelayEvent =
  'xstate.after.agentStopLimit.session.stopping';
const agentStartDelayEvent =
  'xstate.after.agentStartLimit.session.open.live.starting';
const nativeDrainedEvent = 'xstate.done.actor.drainNative';
const agentRestartDelayEvent =
  'xstate.after.agentRestartDelay.session.open.recovering';
const feedFlushDelayEvent = 'xstate.after.feedFlushLimit.session.open.flushing';
const feedFailureMessage = 'Feed failed';
const data = {
  sessionId: 'session-1',
  projectId: 'project-1',
  agent: 'mock',
  vendorSessionId: null,
  checkout: { path: '/project', branch: null },
  epoch: 0,
  maxRevision: 0,
  nextPosition: 0,
  configValues: [],
  activityAt: 1000,
  undisclosedInterruptedTurnId: null,
} satisfies SessionData;
/*
 * Graph traversal is structural: promise completions and failures are symbolic events.
 * Actual Git, Agent, Feed, and Writer effects are covered by the real Engine cases above.
 */
const ready = {
  type: 'agent.ready',
  vendorSessionId: 'vendor-1',
  configOptions: [],
  capabilities: {
    permissionFeedback: true,
    planApproval: 'continueTurn',
    stopShell: false,
  },
  continuedOutside: false,
} satisfies AgentEvent;
const adapter = agentAdapters[0];
if (!adapter)
  throw new Error('The structural Session model needs an Agent identity');
const machine = sessionMachine;
type SessionSnapshot = SnapshotFrom<typeof machine>;
const events = [
  {
    type: checkoutCreatedEvent,
    actorId: 'createCheckout',
    output: data,
  },
  {
    type: checkoutCreateFailedEvent,
    actorId: 'createCheckout',
    error: 'Could not create',
  },
  {
    type: checkoutDiscardedEvent,
    actorId: 'discardCheckout',
    output: undefined,
  },
  {
    type: checkoutDiscardFailedEvent,
    actorId: 'discardCheckout',
    error: 'Could not remove',
  },
  {
    type: sessionLoadedEvent,
    actorId: 'loadSession',
    output: data,
  },
  {
    type: sessionLoadFailedEvent,
    actorId: 'loadSession',
    error: 'Could not load',
  },
  { type: feedFailedEvent, actorId: 'feed', error: feedFailureMessage },
  ready,
  { type: sessionPromptEvent, turnId: 'turn-1', content: [] },
  { type: sessionSetConfigEvent, configId: 'mode', value: 'plan' },
  {
    type: permissionRequestedEvent,
    request: {
      toolCallId: 'tool-1',
      title: 'Read',
      options: permissionOptions,
    },
  },
  { type: answerPermissionEvent, requestId: requestModel, optionId: null },
  {
    type: elicitationRequestedEvent,
    request: {
      mode: 'form',
      message: fileQuestion,
      requestedSchema: { properties: {} },
    },
  },
  { type: answerElicitationEvent, requestId: requestModel, action: 'cancel' },
  { type: agentTurnEndedEvent, stopReason: 'end_turn' },
  { type: sessionCancelEvent },
  { type: 'session.storageFailing' },
  { type: sessionCloseEvent },
  { type: agentUsageEvent, usage: { used: 10, size: 100 } },
  { type: 'agent.messageRejected', reason: 'Unknown vendor message' },
  { type: configOptionsChangedEvent, configOptions: [] },
  {
    type: agentFeedEvent,
    change: {
      type: 'upsert',
      update: {
        id: 'reply',
        messageId: 'reply',
        sessionUpdate: 'agent_message',
        state: 'settled',
        content: [],
      },
    },
  },
  { type: 'native.failed', error: 'Agent crashed' },
  {
    type: callbackFailedEvent,
    actorId: 'vendorSession',
    error: 'Agent callback crashed',
  },
  { type: nativeDrainedEvent, actorId: 'drainNative', output: undefined },
  { type: 'agent.turnStarted' },
  { type: feedFlushedEvent, actorId: 'feed', output: undefined },
  { type: checkoutDelayEvent },
  { type: cancelDelayEvent },
  { type: agentStopDelayEvent },
  { type: feedFailureStopDelayEvent },
  { type: agentStartDelayEvent },
  { type: agentRestartDelayEvent },
  { type: feedFlushDelayEvent },
] satisfies GraphEventFromLogic<typeof machine>[];
type SessionEvent = (typeof events)[number];
const key = (snapshot: SessionSnapshot | undefined): string | undefined =>
  snapshot &&
  JSON.stringify({
    value: snapshot.value,
    permissions: snapshot.context.permissionQueue.length,
    elicitation: snapshot.context.elicitationQueue.length > 0,
    crashes: snapshot.context.agentCrashes.length,
    stored: snapshot.context.stored,
    activeTurnId: snapshot.context.activeTurnId,
  });
const canGraphEvent = (
  snapshot: SessionSnapshot,
  event: SessionEvent,
): boolean => {
  switch (event.type) {
    case checkoutCreatedEvent:
    case checkoutCreateFailedEvent:
    case checkoutDelayEvent:
      return snapshot.matches('creating');
    case sessionLoadedEvent:
    case sessionLoadFailedEvent:
      return snapshot.matches('loading');
    case checkoutDiscardedEvent:
    case checkoutDiscardFailedEvent:
      return snapshot.matches('discarding');
    case feedFlushedEvent:
    case feedFailedEvent:
      return snapshot.matches('open');
    case cancelDelayEvent:
      return snapshot.matches({ open: { live: 'cancelling' } });
    case agentStopDelayEvent:
      return snapshot.matches({ open: 'draining' });
    case feedFailureStopDelayEvent:
      return snapshot.matches('stopping');
    case nativeDrainedEvent:
      return (
        snapshot.matches('stopping') || snapshot.matches({ open: 'draining' })
      );
    case agentStartDelayEvent:
      return snapshot.matches({ open: { live: 'starting' } });
    case agentRestartDelayEvent:
      return snapshot.matches({ open: 'recovering' });
    case feedFlushDelayEvent:
      return snapshot.matches({ open: 'flushing' });
    default:
      return snapshot.can(event);
  }
};
type ModelOptions = NonNullable<
  Parameters<typeof getShortestPaths<typeof machine, SessionEvent>>[1]
>;
const models = (['new', 'existing'] as const).map((kind): ModelOptions => ({
  input:
    kind === 'existing'
      ? {
          database,
          runtimeDirectory,
          adapter,
          now: (): number => 1000,
          createId: (): string => requestModel,
          kind,
          sessionId: 'session-1',
        }
      : {
          database,
          runtimeDirectory,
          adapter,
          now: (): number => 1000,
          createId: (): string => requestModel,
          kind,
          sessionId: 'session-1',
          projectId: 'project-1',
          projectPath: '/project',
          agent: 'mock',
          checkout: { type: 'main' },
          configOptions: [],
          prompt: [{ type: 'text', text: 'Build it' }],
          turnId: 'turn-1',
        },
  events,
  // Two queued requests cover both queue branches; snapshot equality bounds crash timestamps and repeated Turns.
  filterEvents: (snapshot, event): boolean =>
    snapshot.status === 'active' &&
    canGraphEvent(snapshot, event) &&
    (event.type !== permissionRequestedEvent ||
      snapshot.context.permissionQueue.length < 2),
  serializeState: (snapshot, event, previous): string =>
    JSON.stringify({
      key: key(snapshot),
      via: event && `${key(previous)} ${event.type}`,
    }),
}));
const paths = models.flatMap(
  (
    options,
  ): ReturnType<typeof getShortestPaths<typeof machine, SessionEvent>> =>
    terminalPaths(getShortestPaths(machine, options)),
);
it('structurally ends timed-out Checkout creation with a retryable failure', (): void => {
  const timedOut = paths
    .flatMap((path) => path.steps)
    .find((step) => step.event.type === checkoutDelayEvent)?.state;
  if (!timedOut) throw new Error('The graph did not traverse Checkout timeout');
  expect(timedOut.status).toBe('done');
  expect(timedOut.output).toEqual({
    failure:
      'Checkout creation exceeded checkoutLimit (10000 ms). Retry the Session.',
  });
});

it('structurally cancels a running Turn whose Feed rows storage refuses', (): void => {
  const refused = paths
    .flatMap((path) => path.steps)
    .filter((step) => step.event.type === 'session.storageFailing');
  expect(refused.length).toBeGreaterThan(0);
  for (const { state } of refused) {
    expect(state.matches({ open: { live: 'cancelling' } })).toBe(true);
    expect(state.context.storageFailedTurn).toBe(true);
  }
});

it('structurally retains failed Feed cleanup until the native drain completes', (): void => {
  const retained = paths
    .flatMap((path) => path.steps)
    .filter(
      (step) =>
        step.event.type === feedFailedEvent && step.state.matches('stopping'),
    );
  expect(retained.length).toBeGreaterThan(0);
  for (const { state } of retained) {
    expect(state.status).toBe('active');
    expect(state.context.failure).toBe(feedFailureMessage);
  }
  expect(
    paths.some((path) =>
      path.steps.some(
        (step, index) =>
          step.event.type === nativeDrainedEvent &&
          path.steps[index - 1]?.state.matches('stopping'),
      ),
    ),
  ).toBe(true);
});

it('structurally removes a failed Session while its sibling remains prompt-capable', (): void => {
  const idle = paths
    .flatMap((path) => path.steps)
    .find((step) => step.state.matches({ open: { live: 'idle' } }))?.state;
  if (!idle) throw new Error('The graph did not reach an idle Session');
  const failed = createActor(sessionMachine, {
    input: idle.context.input,
    snapshot: idle,
  });
  const sibling = createActor(sessionMachine, {
    input: idle.context.input,
    snapshot: idle,
  });
  const before = openSessionsMachine.resolveState({
    value: 'running',
    context: {
      database,
      runtimeDirectory,
      now: () => 1000,
      createId: () => 'structural',
      adapters: [adapter],
      sessions: { failed, sibling },
    },
  });
  const after = getNextSnapshot(openSessionsMachine, before, {
    type: 'xstate.error.actor.session:failed',
    actorId: 'session:failed',
    error: new Error('Feed actor failed'),
  });
  expect(after.status).toBe('active');
  expect(Object.keys(after.context.sessions)).toEqual(['sibling']);
  expect(after.context.sessions.sibling?.getSnapshot().can(firstPrompt)).toBe(
    true,
  );
});

it.each(models)(
  'walks every transition of the $input.kind Session model',
  (options): void => {
    expect(
      unwalkedTransitions({
        models: [
          {
            getAdjacencyMap: (): ReturnType<
              typeof getAdjacencyMap<typeof machine, SessionEvent>
            > => getAdjacencyMap(machine, options),
          },
        ],
        paths: paths.filter(
          (path): boolean =>
            path.steps[0]?.state.context.input.kind === options.input?.kind,
        ),
        stateKey: (snapshot): string => String(key(snapshot)),
        eventKey: (event): typeof event.type => event.type,
      }),
    ).toEqual([]);
  },
);

const callbackFailureStates = new Map<string, SessionSnapshot>();
for (const path of paths)
  for (const [index, step] of path.steps.entries()) {
    if (step.event.type !== callbackFailedEvent) continue;
    const previous = path.steps[index - 1]?.state;
    if (previous) callbackFailureStates.set(String(key(previous)), previous);
  }
it.each([...callbackFailureStates.values()])(
  'covers defensive native callback failure in $value',
  (before): void => {
    const failed = getNextSnapshot(machine, before, {
      type: callbackFailedEvent,
      error: 'Native callback crashed',
    });
    expect(
      failed.matches(
        before.context.stored && before.context.agentCrashes.length < 2
          ? { open: 'recovering' }
          : { open: 'draining' },
      ),
    ).toBe(true);
    expect(failed.context.activeTurnId).toBeNull();
  },
);
