import { type AgentCommand, type AgentReady } from '@repo/agents';
import type {
  Notice,
  SessionUpdate,
  SessionSnapshot as PublicSessionSnapshot,
} from '@repo/contracts';
import type { FeedSubscribeOutput } from '@repo/contracts';
import { permissionOptions, type SessionConfigOption } from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  createMockAdapter,
  type MockAgentScript,
  type MockAgentStream,
  mockReady,
  mockReadyEvent,
} from '@repo/mocks/agent';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import { afterAll, afterEach, expect, it, onTestFinished, vi } from 'vitest';
import {
  createActor,
  type ActorRefFromLogic,
  type SnapshotFrom,
  getNextSnapshot,
} from 'xstate';
import {
  type GraphEventFromLogic,
  getShortestPaths,
  getAdjacencyMap,
} from 'xstate/graph';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { messageChange } from '#mocks/feed';
import { findSessionActor } from './session-system';
type SessionTestHost = Awaited<ReturnType<typeof startEngineTestHost>>;
const firstPrompt = {
  type: 'session.prompt' as const,
  turnId: 'turn-1',
  content: [],
};
import { appRouter } from '../../engine/router';
import { registryMachine } from './registry-machine';
import { sendSessionCommand } from './session-command';
import type { SessionData } from './session-data';
import { sessionMachine } from './session-machine';

const callbackFailedEvent = 'xstate.error.actor.vendorSession';
const agentUsageEvent = 'agent.usage';
const agentFeedEvent = 'agent.feed';
const sessionPromptEvent = 'session.prompt';
const agentPromptEvent = 'agent.prompt';
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
const agentSetConfigEvent = 'agent.setConfigOption';
const requestModel = 'request-model';

const cleanups: (() => void | Promise<void>)[] = [];
afterEach(async (): Promise<void> => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  vi.useRealTimers();
});
// The model paths share one database, removed after the last test.
afterAll((): void => remove());

async function subscribeToSession(host: SessionTestHost): Promise<{
  updates: AsyncIterator<FeedSubscribeOutput, void>;
  controller: AbortController;
}> {
  const controller = new AbortController();
  cleanups.push((): void => controller.abort());
  const updates = (
    await host
      .createCaller({ signal: controller.signal })
      .feed.subscribe({ sessionId: 'session-1', after: null })
  )[Symbol.asyncIterator]();
  return { updates, controller };
}

async function readPublicSessionSnapshot(
  caller: ReturnType<typeof appRouter.createCaller>,
): Promise<PublicSessionSnapshot> {
  for await (const event of await caller.feed.subscribe({
    sessionId: 'session-1',
    after: null,
  }))
    if (event.type === 'snapshot') return event.snapshot;
  throw new Error('The Session did not publish its snapshot');
}

async function openSession(overrides: Partial<MockAgentScript> = {}): Promise<{
  session: ActorRefFromLogic<typeof sessionMachine>;
  caller: ReturnType<typeof appRouter.createCaller>;
  host: SessionTestHost;
  commands: AgentCommand[];
  stream: MockAgentStream;
  database: Database;
  currentStream: () => MockAgentStream;
}> {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const commands: AgentCommand[] = [];
  let stream: MockAgentStream | undefined;
  const adapter = createMockAdapter({
    stream: (value): undefined => {
      stream = value;
      value.receive((command): number => commands.push(command));
    },
    ...overrides,
  });
  const host = await startEngineTestHost({ database, adapters: [adapter] });
  host.sessionRegistry.send({
    type: 'sessions.open',
    sessionId: 'session-1',
    agent: adapter.agent,
  });
  const session = findSessionActor(host.engine.system, 'session-1');
  if (!session) throw new Error('Session did not open');
  const caller = host.caller;
  await vi.waitFor(() =>
    expect(
      host.database.$client
        .prepare('SELECT vendor_session_id FROM session WHERE id = ?')
        .get('session-1'),
    ).toMatchObject({ vendor_session_id: 'vendor-1' }),
  );
  if (!stream) throw new Error('Session not ready');
  return {
    session,
    caller,
    host,
    commands,
    stream,
    database,
    currentStream: (): MockAgentStream => {
      if (!stream) throw new Error('No Agent stream');
      return stream;
    },
  };
}

it('keeps the Session running while rejected messages show warning Notices', async (): Promise<void> => {
  const log = vi.spyOn(console, 'error').mockImplementation((): void => {});
  cleanups.push((): void => {
    log.mockRestore();
  });
  const { session, caller, stream } = await openSession();
  sendSessionCommand(session, firstPrompt);
  stream.send({
    type: agentUsageEvent,
    usage: { used: Number.NaN, size: 100 },
  });
  stream.send({
    type: 'agent.messageRejected',
    reason: 'Another unknown message',
  });
  stream.send({ type: agentFeedEvent, change: messageChange('settled') });
  const { rows } = await vi.waitFor(
    async (): Promise<Awaited<ReturnType<typeof caller.feed.page>>> => {
      const page = await caller.feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 40,
      });
      expect(
        page.rows.filter(
          (row): row is Notice => row.sessionUpdate === 'notice',
        ),
      ).toHaveLength(2);
      return page;
    },
  );
  expect(
    rows.filter((row): row is Notice => row.sessionUpdate === 'notice'),
  ).toEqual([
    expect.objectContaining({
      severity: 'warning',
      title: 'The Agent sent an unrecognised message',
      description: 'Invalid Argo event: agent.usage',
    }),
    expect.objectContaining({
      severity: 'warning',
      title: 'The Agent sent an unrecognised message',
      description: 'Another unknown message',
    }),
  ]);
  expect(await readPublicSessionSnapshot(caller)).toMatchObject({
    state: 'running',
    usage: null,
  });
  expect(log).toHaveBeenCalledTimes(2);
  expect(log).toHaveBeenNthCalledWith(
    1,
    'session session-1: rejected an Agent message: Invalid Argo event: agent.usage',
  );
  expect(log).toHaveBeenNthCalledWith(
    2,
    'session session-1: rejected an Agent message: Another unknown message',
  );
  expect(
    rows.filter(
      (
        row,
      ): row is Extract<SessionUpdate, { sessionUpdate: 'agent_message' }> =>
        row.sessionUpdate === 'agent_message',
    ),
  ).toHaveLength(1);
});

it('runs one Turn and rejects a second prompt while it runs', async (): Promise<void> => {
  const { session, caller, commands, stream } = await openSession();
  sendSessionCommand(session, {
    type: sessionPromptEvent,
    turnId: 'turn-1',
    content: [{ type: 'text', text: 'Hello' }],
  });
  expect(await readPublicSessionSnapshot(caller)).toMatchObject({
    state: 'running',
    activeTurnId: 'turn-1',
  });
  expect(
    await caller.feed.row({ sessionId: 'session-1', id: 'turn-1:user' }),
  ).toMatchObject({
    position: 0,
    sessionUpdate: 'user_message',
    content: [{ type: 'text', text: 'Hello' }],
  });
  await vi.waitFor((): void =>
    expect(commands).toContainEqual({
      type: agentPromptEvent,
      turnId: 'turn-1',
      content: [{ type: 'text', text: 'Hello' }],
    }),
  );
  expect((): void =>
    sendSessionCommand(session, {
      type: sessionPromptEvent,
      turnId: 'turn-2',
      content: [],
    }),
  ).toThrow(expect.objectContaining({ code: 'CONFLICT' }));
  stream.send({ type: agentTurnEndedEvent, stopReason: 'end_turn' });
  expect(await readPublicSessionSnapshot(caller)).toMatchObject({
    state: 'idle',
    activeTurnId: null,
  });
});

it('answers only the head Permission request and keeps other requests visible', async (): Promise<void> => {
  const { session, caller, commands, stream } = await openSession();
  sendSessionCommand(session, firstPrompt);
  const request = {
    toolCallId: 'tool-1',
    title: 'Read a file',
    options: permissionOptions,
  };
  stream.send({ type: permissionRequestedEvent, request });
  stream.send({
    type: permissionRequestedEvent,
    request: { ...request, toolCallId: 'tool-2' },
  });
  stream.send({
    type: elicitationRequestedEvent,
    request: {
      mode: 'form',
      message: fileQuestion,
      requestedSchema: { properties: {} },
    },
  });
  expect(await readPublicSessionSnapshot(caller)).toMatchObject({
    state: 'requires_action',
    pendingPermission: request,
    pendingElicitation: { message: fileQuestion },
  });
  const first = (await readPublicSessionSnapshot(caller)).pendingPermission;
  if (!first) throw new Error('No Permission request');
  expect((): void =>
    sendSessionCommand(session, {
      type: answerPermissionEvent,
      requestId: 'not-the-head',
      optionId: 'allow_once',
    }),
  ).toThrow(expect.objectContaining({ code: 'CONFLICT' }));
  sendSessionCommand(session, {
    type: answerPermissionEvent,
    requestId: first.requestId,
    optionId: 'allow_once',
  });
  const second = (await readPublicSessionSnapshot(caller)).pendingPermission;
  expect(second).toMatchObject({ toolCallId: 'tool-2' });
  sendSessionCommand(session, {
    type: answerPermissionEvent,
    requestId: second?.requestId ?? 'missing',
    optionId: 'allow_once',
  });
  expect(await readPublicSessionSnapshot(caller)).toMatchObject({
    state: 'requires_action',
    pendingPermission: null,
  });
  const question = (await readPublicSessionSnapshot(caller)).pendingElicitation;
  if (!question) throw new Error('No Elicitation request');
  sendSessionCommand(session, {
    type: answerElicitationEvent,
    requestId: question.requestId,
    action: 'accept',
    content: { file: 'README.md' },
  });
  expect(await readPublicSessionSnapshot(caller)).toMatchObject({
    state: 'running',
    pendingElicitation: null,
  });
  await vi.waitFor((): void =>
    expect(commands).toContainEqual({
      type: 'agent.answerElicitation',
      action: 'accept',
      content: { file: 'README.md' },
    }),
  );
  expect((): void =>
    sendSessionCommand(session, {
      type: answerElicitationEvent,
      requestId: question.requestId,
      action: 'decline',
    }),
  ).toThrow(expect.objectContaining({ code: 'CONFLICT' }));
});

it('cancels queued requests and waits for the Agent to end the Turn', async (): Promise<void> => {
  const { session, caller, commands, stream } = await openSession();
  sendSessionCommand(session, firstPrompt);
  stream.send({
    type: permissionRequestedEvent,
    request: {
      toolCallId: 'tool-1',
      title: 'Run a command',
      options: permissionOptions,
    },
  });
  stream.send({
    type: elicitationRequestedEvent,
    request: {
      mode: 'form',
      message: 'Continue?',
      requestedSchema: { properties: {} },
    },
  });
  sendSessionCommand(session, { type: sessionCancelEvent });
  await vi.waitFor((): void =>
    expect(commands).toEqual(
      expect.arrayContaining([
        { type: 'agent.cancel' },
        {
          type: 'agent.answerPermission',
          toolCallId: 'tool-1',
          optionId: null,
        },
        { type: 'agent.answerElicitation', action: 'cancel' },
      ]),
    ),
  );
  expect(await readPublicSessionSnapshot(caller)).toMatchObject({
    state: 'running',
    activeTurnId: 'turn-1',
    pendingPermission: null,
    pendingElicitation: null,
    pendingPlanProposal: null,
  });
  stream.send({ type: agentTurnEndedEvent, stopReason: 'cancelled' });
  expect(await readPublicSessionSnapshot(caller)).toMatchObject({
    state: 'idle',
    activeTurnId: null,
  });
});

it('flushes Feed changes when closing and ends with no failure', async (): Promise<void> => {
  const { session, caller, stream } = await openSession();
  sendSessionCommand(session, firstPrompt);
  stream.send({ type: agentFeedEvent, change: messageChange('open') });
  await caller.session.close({ sessionId: 'session-1' });
  await vi.waitFor(async (): Promise<void> =>
    expect(
      (
        await caller.feed.page({
          sessionId: 'session-1',
          direction: 'tail',
          limit: 40,
        })
      ).rows,
    ).toHaveLength(2),
  );
});

it('keeps a settled row in its original position when the Agent changes it later', async (): Promise<void> => {
  const { session, caller, stream } = await openSession();
  sendSessionCommand(session, firstPrompt);
  stream.send({ type: agentFeedEvent, change: messageChange('settled') });
  stream.send({
    type: agentFeedEvent,
    change: {
      type: 'patch',
      id: 'reply',
      set: { content: [{ type: 'text', text: 'Updated' }] },
    },
  });
  expect(
    await caller.feed.row({ sessionId: 'session-1', id: 'reply' }),
  ).toMatchObject({
    position: 1,
    revision: 3,
    content: [{ type: 'text', text: 'Updated' }],
  });
});

it('streams Session snapshots only when their projected value changes', async (): Promise<void> => {
  const { session, host, stream } = await openSession();
  const { updates, controller } = await subscribeToSession(host);
  expect((await updates.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { state: 'idle', maxRevision: 0 },
  });
  stream.send({ type: agentUsageEvent, usage: { used: 10, size: 100 } });
  expect((await updates.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { usage: { used: 10, size: 100 } },
  });
  stream.send({ type: agentUsageEvent, usage: { used: 10, size: 100 } });
  stream.send({ type: agentUsageEvent, usage: { used: 20, size: 100 } });
  expect((await updates.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { usage: { used: 20, size: 100 } },
  });
  sendSessionCommand(session, firstPrompt);
  const running = (await updates.next()).value;
  expect(running).toMatchObject({
    type: 'snapshot',
    snapshot: { state: 'running', activeTurnId: 'turn-1', maxRevision: 1 },
  });
  controller.abort();
  expect(await updates.next()).toMatchObject({ done: true });
});

it('restarts the Agent with its vendor Session and gives up after three crashes in ten minutes', async (): Promise<void> => {
  vi.useFakeTimers();
  const resumed: (string | null)[] = [];
  const { session, caller, currentStream } = await openSession({
    connect: async (input): Promise<AgentReady> => {
      resumed.push(input.vendorSessionId);
      return mockReady;
    },
  });
  const updates = (
    await caller.feed.subscribe({ sessionId: 'session-1', after: null })
  )[Symbol.asyncIterator]();
  await updates.next();
  sendSessionCommand(session, firstPrompt);
  for (let index = 0; index < 3; index++) {
    currentStream().fail(new Error('Agent crashed'));
    await vi.advanceTimersByTimeAsync(index === 2 ? 0 : 1000);
  }
  expect(resumed).toEqual([null, 'vendor-1', 'vendor-1']);
  const closed = [];
  for await (const event of { [Symbol.asyncIterator]: () => updates })
    closed.push(event);
  expect(closed.at(-1)).toEqual({
    type: 'closed',
    failure: 'The Agent stopped three times in ten minutes',
  });
  const rows = (
    await caller.feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 40,
    })
  ).rows;
  expect(
    rows.filter((row): row is Notice => row.sessionUpdate === 'notice'),
  ).toHaveLength(3);
});

it('recovers when cancellation times out and writes a Notice for the Turn', async (): Promise<void> => {
  vi.useFakeTimers();
  const { session, caller } = await openSession();
  sendSessionCommand(session, firstPrompt);
  sendSessionCommand(session, { type: sessionCancelEvent });
  await vi.advanceTimersByTimeAsync(10_000);
  expect(
    await caller.feed.row({
      sessionId: 'session-1',
      id: 'turn-1:cancel-timeout',
    }),
  ).toMatchObject({
    sessionUpdate: 'notice',
    turnId: 'turn-1',
    title: 'The Agent did not stop after cancellation',
  });
  expect((): void =>
    sendSessionCommand(session, {
      type: sessionPromptEvent,
      turnId: 'turn-2',
      content: [],
    }),
  ).toThrow(expect.objectContaining({ code: 'CONFLICT' }));
  await vi.advanceTimersByTimeAsync(1000);
  expect((): void =>
    sendSessionCommand(session, {
      type: sessionPromptEvent,
      turnId: 'turn-2',
      content: [],
    }),
  ).not.toThrow();
});

it('keeps the latest held choices through updates and cancellation, then applies them in order', async (): Promise<void> => {
  const options = [
    {
      configId: 'model',
      name: 'Model',
      category: 'model',
      type: 'select',
      currentValue: 'small',
      options: [
        { value: 'small', name: 'Small' },
        { value: 'large', name: 'Large' },
      ],
    },
    {
      configId: 'mode',
      name: 'Mode',
      category: 'mode',
      type: 'select',
      currentValue: 'auto',
      options: [
        { value: 'auto', name: 'Auto' },
        { value: 'plan', name: 'Plan' },
      ],
    },
  ] satisfies SessionConfigOption[];
  const { session, caller, stream, commands } = await openSession({
    connect: async (): Promise<typeof mockReady> => ({
      ...mockReady,
      configOptions: options,
    }),
  });
  sendSessionCommand(session, firstPrompt);
  await expect
    .poll((): AgentCommand[] => commands)
    .toEqual([{ ...firstPrompt, type: agentPromptEvent }]);
  for (const [configId, value] of [
    ['model', 'large'],
    ['mode', 'plan'],
    ['model', 'small'],
    ['model', 'large'],
  ] as const)
    sendSessionCommand(session, {
      type: sessionSetConfigEvent,
      configId,
      value,
    });
  stream.send({
    type: configOptionsChangedEvent,
    configOptions: options.map((option): typeof option => ({
      ...option,
      name: `Renamed ${option.name}`,
    })),
  });
  expect((await readPublicSessionSnapshot(caller)).configOptions).toMatchObject(
    [
      {
        currentValue: 'large',
        name: 'Renamed Model',
        _meta: { argo: { heldUntilNextTurn: true } },
      },
      { currentValue: 'plan', _meta: { argo: { heldUntilNextTurn: true } } },
    ],
  );
  expect(commands).toEqual([{ ...firstPrompt, type: agentPromptEvent }]);
  sendSessionCommand(session, { type: sessionCancelEvent });
  sendSessionCommand(session, {
    type: sessionSetConfigEvent,
    configId: 'mode',
    value: 'auto',
  });
  stream.send({ type: agentTurnEndedEvent, stopReason: 'cancelled' });
  sendSessionCommand(session, {
    type: sessionPromptEvent,
    turnId: 'turn-2',
    content: [],
  });
  await expect
    .poll((): AgentCommand[] => commands)
    .toEqual([
      { ...firstPrompt, type: agentPromptEvent },
      { type: 'agent.cancel' },
      { type: agentSetConfigEvent, configId: 'model', value: 'large' },
      { type: agentSetConfigEvent, configId: 'mode', value: 'auto' },
      { type: agentPromptEvent, turnId: 'turn-2', content: [] },
    ]);
  stream.send({ type: configOptionsChangedEvent, configOptions: options });
  expect((await readPublicSessionSnapshot(caller)).configOptions).toMatchObject(
    [{ currentValue: 'small' }, { currentValue: 'auto' }],
  );
  expect(
    (await readPublicSessionSnapshot(caller)).configOptions[1]?._meta?.argo
      ?.heldUntilNextTurn,
  ).not.toBe(true);
  stream.send({
    type: configOptionsChangedEvent,
    configOptions: options.map((option): typeof option => ({
      ...option,
      currentValue: option.configId === 'model' ? 'large' : 'auto',
    })),
  });
  expect(
    (await readPublicSessionSnapshot(caller)).configOptions.map(
      (option): boolean | undefined => option._meta?.argo?.heldUntilNextTurn,
    ),
  ).toEqual([undefined, undefined]);
});

it('closes after the Agent stop limit even when the Agent does not stop', async (): Promise<void> => {
  vi.useFakeTimers();
  const { caller } = await openSession({
    stop: (): Promise<void> => new Promise((): void => {}),
  });
  let closed = false;
  const closing = caller.session.close({ sessionId: 'session-1' }).then(() => {
    closed = true;
  });
  await vi.advanceTimersByTimeAsync(4999);
  expect(closed).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await closing;
  expect(closed).toBe(true);
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
const ready = mockReadyEvent;
const adapter = createMockAdapter();
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
    expect(state.context.hasStorageFailed).toBe(true);
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
  const before = registryMachine.resolveState({
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
  const after = getNextSnapshot(registryMachine, before, {
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

it('attaches live Feed updates when a subscription starts while the Session loads', async (): Promise<void> => {
  vi.useFakeTimers();
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const adapter = createMockAdapter({
    stream: (): undefined => {},
  });
  const host = await startEngineTestHost({ database, adapters: [adapter] });
  host.sessionRegistry.send({
    type: 'sessions.open',
    sessionId: 'session-1',
    agent: adapter.agent,
  });
  const sessionActor = findSessionActor(host.engine.system, 'session-1');
  if (!sessionActor) throw new Error('Session did not open');
  const { updates } = await subscribeToSession(host);
  expect((await updates.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { maxRevision: 0 },
  });
  await vi.waitFor(() =>
    expect(
      database.$client
        .prepare('SELECT vendor_session_id FROM session WHERE id = ?')
        .get('session-1'),
    ).toMatchObject({ vendor_session_id: 'vendor-1' }),
  );
  sendSessionCommand(sessionActor, {
    type: sessionPromptEvent,
    turnId: 'turn-1',
    content: [],
  });
  expect((await updates.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { state: 'running', maxRevision: 1 },
  });
  await vi.advanceTimersByTimeAsync(60);
  expect((await updates.next()).value).toMatchObject({
    type: 'row.upsert',
    row: { sessionUpdate: 'user_message' },
  });
});
