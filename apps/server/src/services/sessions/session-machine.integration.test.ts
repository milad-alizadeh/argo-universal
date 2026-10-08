import { randomUUID } from 'node:crypto';
import { type AgentCommand, agentMachine } from '@repo/agents';
import { sessionRows } from '@repo/api/mocks';
import type { Notice, SessionUpdate } from '@repo/contracts';
import type { FeedSubscribeOutput } from '@repo/contracts';
import { permissionOptions, type SessionConfigOption } from '@repo/contracts';
import {
  createMockAdapter,
  type MockAgentScript,
  type MockAgentStream,
  type MockAgentStreamEvent,
  mockReady,
  mockReadyEvent,
} from '@repo/mocks/agent';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import {
  type ActorLogic,
  type AnyEventObject,
  createActor,
  type EventFromLogic,
  fromPromise,
  type SnapshotFrom,
  setup,
  waitFor,
} from 'xstate';
import { TestModel } from 'xstate/graph';
import { openTestDatabase } from '#mocks/database';
import { messageChange } from '#mocks/feed';
import { createSessionHost, firstPrompt } from '#mocks/session';
import { type FeedActorRef, feedMachine } from '../feed';
import type { createFeedService } from '../feed';
import { databaseWriterId, writerMachine } from '../feed';
import { sendSessionCommand } from './session-command';
import { type SessionMachineInput, sessionMachine } from './session-machine';
import { toSessionSnapshot } from './session-snapshot';

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

const cleanups: (() => void)[] = [];
// The model paths' actors, stopped after each path.
const actors: { stop: () => void }[] = [];
afterEach((): void => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  for (const actor of actors.splice(0)) actor.stop();
  vi.useRealTimers();
});
// The model paths share one database, removed after the last test.
afterAll((): void => remove());

function subscribeToSession(service: ReturnType<typeof createFeedService>): {
  updates: AsyncIterator<FeedSubscribeOutput, void>;
  controller: AbortController;
} {
  const controller = new AbortController();
  cleanups.push((): void => controller.abort());
  const updates = service
    .subscribe({ sessionId: 'session-1', after: null }, controller.signal)
    [Symbol.asyncIterator]();
  return { updates, controller };
}

async function openSession(overrides: Partial<MockAgentScript> = {}): Promise<{
  session: import('xstate').ActorRefFromLogic<typeof sessionMachine>;
  feed: FeedActorRef;
  service: import('@repo/api').FeedService;
  commands: AgentCommand[];
  stream: MockAgentStream;
  database: import('@repo/db').Database;
  currentStream: () => MockAgentStream;
}> {
  const { database, remove } = openTestDatabase();
  cleanups.push(remove);
  const commands: AgentCommand[] = [];
  let stream: MockAgentStream | undefined;
  const adapter = createMockAdapter({
    stream: (value): undefined => {
      stream = value;
      value.receive((command): number => commands.push(command));
    },
    ...overrides,
  });
  const { root, session, service, findFeed } = createSessionHost(
    database,
    adapter,
  );
  cleanups.push((): typeof root => root.stop());
  await waitFor(session, (snapshot): boolean => snapshot.can(firstPrompt));
  const feed = findFeed();
  if (!feed || !stream) throw new Error('Session not ready');
  return {
    session,
    feed,
    service,
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
  const { session, service, stream } = await openSession();
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
  const { rows } = await vi.waitFor((): ReturnType<typeof service.page> => {
    const page = service.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 40,
    });
    expect(
      page.rows.filter((row): row is Notice => row.sessionUpdate === 'notice'),
    ).toHaveLength(2);
    return page;
  });
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
  expect(session.getSnapshot().context.rejectedMessages).toBe(2);
  expect(session.getSnapshot().context.failure).toBeNull();
  expect(session.getSnapshot().context.usage).toBeNull();
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
  const { session, feed, service, commands, stream } = await openSession();
  sendSessionCommand(session, {
    type: sessionPromptEvent,
    turnId: 'turn-1',
    content: [{ type: 'text', text: 'Hello' }],
  });
  expect(
    toSessionSnapshot(
      session.getSnapshot(),
      feed.getSnapshot(),
      sessionRows.idle,
    ),
  ).toMatchObject({ state: 'running', activeTurnId: 'turn-1' });
  expect(
    service.row({ sessionId: 'session-1', id: 'turn-1:user' }),
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
  expect(
    toSessionSnapshot(
      session.getSnapshot(),
      feed.getSnapshot(),
      sessionRows.idle,
    ),
  ).toMatchObject({ state: 'idle', activeTurnId: null });
});

it('answers only the head Permission request and keeps other requests visible', async (): Promise<void> => {
  const { session, feed, commands, stream } = await openSession();
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
  expect(
    toSessionSnapshot(
      session.getSnapshot(),
      feed.getSnapshot(),
      sessionRows.idle,
    ),
  ).toMatchObject({
    state: 'requires_action',
    pendingPermission: request,
    pendingElicitation: { message: fileQuestion },
  });
  expect((): void =>
    sendSessionCommand(session, {
      type: answerPermissionEvent,
      toolCallId: 'tool-2',
      optionId: 'allow_once' as const,
    }),
  ).toThrow(expect.objectContaining({ code: 'CONFLICT' }));
  sendSessionCommand(session, {
    type: answerPermissionEvent,
    toolCallId: 'tool-1',
    optionId: 'allow_once' as const,
  });
  expect(
    toSessionSnapshot(
      session.getSnapshot(),
      feed.getSnapshot(),
      sessionRows.idle,
    ),
  ).toMatchObject({
    state: 'requires_action',
    pendingPermission: { toolCallId: 'tool-2' },
  });
  sendSessionCommand(session, {
    type: answerPermissionEvent,
    toolCallId: 'tool-2',
    optionId: 'allow_once' as const,
  });
  expect(
    toSessionSnapshot(
      session.getSnapshot(),
      feed.getSnapshot(),
      sessionRows.idle,
    ),
  ).toMatchObject({ state: 'requires_action', pendingPermission: null });
  sendSessionCommand(session, {
    type: answerElicitationEvent,
    action: 'accept',
    content: { file: 'README.md' },
  });
  expect(
    toSessionSnapshot(
      session.getSnapshot(),
      feed.getSnapshot(),
      sessionRows.idle,
    ),
  ).toMatchObject({ state: 'running', pendingElicitation: null });
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
      action: 'decline',
    }),
  ).toThrow(expect.objectContaining({ code: 'CONFLICT' }));
});

it('cancels queued requests and waits for the Agent to end the Turn', async (): Promise<void> => {
  const { session, feed, commands, stream } = await openSession();
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
  expect(
    toSessionSnapshot(
      session.getSnapshot(),
      feed.getSnapshot(),
      sessionRows.idle,
    ),
  ).toMatchObject({
    state: 'running',
    activeTurnId: 'turn-1',
    pendingPermission: null,
    pendingElicitation: null,
    pendingPlanProposal: null,
  });
  stream.send({ type: agentTurnEndedEvent, stopReason: 'cancelled' });
  expect(
    toSessionSnapshot(
      session.getSnapshot(),
      feed.getSnapshot(),
      sessionRows.idle,
    ),
  ).toMatchObject({ state: 'idle', activeTurnId: null });
});

it('flushes Feed changes when closing and ends with no failure', async (): Promise<void> => {
  const { session, service, stream } = await openSession();
  sendSessionCommand(session, firstPrompt);
  stream.send({ type: agentFeedEvent, change: messageChange('open') });
  sendSessionCommand(session, { type: sessionCloseEvent });
  await waitFor(
    session,
    (snapshot): snapshot is Extract<typeof snapshot, { status: 'done' }> =>
      snapshot.status === 'done',
  );
  expect(session.getSnapshot().output).toEqual({ failure: null });
  await vi.waitFor((): void =>
    expect(
      service.page({ sessionId: 'session-1', direction: 'tail', limit: 40 })
        .rows,
    ).toHaveLength(2),
  );
});

it('keeps a settled row in its original position when the Agent changes it later', async (): Promise<void> => {
  const { session, service, stream } = await openSession();
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
  expect(service.row({ sessionId: 'session-1', id: 'reply' })).toMatchObject({
    position: 1,
    revision: 3,
    content: [{ type: 'text', text: 'Updated' }],
  });
});

it('streams Session snapshots only when their projected value changes', async (): Promise<void> => {
  const { session, service, stream } = await openSession();
  const { updates, controller } = subscribeToSession(service);
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
  const { session, service, currentStream } = await openSession({
    connect: async (input): Promise<import('@repo/agents').AgentReady> => {
      resumed.push(input.vendorSessionId);
      return mockReady;
    },
  });
  sendSessionCommand(session, firstPrompt);
  for (let index = 0; index < 3; index++) {
    currentStream().fail(new Error('Agent crashed'));
    await vi.advanceTimersByTimeAsync(index === 2 ? 0 : 1000);
  }
  expect(resumed).toEqual([null, 'vendor-1', 'vendor-1']);
  expect(session.getSnapshot().output).toEqual({
    failure: 'The Agent stopped three times in ten minutes',
  });
  const rows = service.page({
    sessionId: 'session-1',
    direction: 'tail',
    limit: 40,
  }).rows;
  expect(
    rows.filter((row): row is Notice => row.sessionUpdate === 'notice'),
  ).toHaveLength(3);
});

it('recovers when cancellation times out and writes a Notice for the Turn', async (): Promise<void> => {
  vi.useFakeTimers();
  const { session, service } = await openSession();
  sendSessionCommand(session, firstPrompt);
  sendSessionCommand(session, { type: sessionCancelEvent });
  await vi.advanceTimersByTimeAsync(10_000);
  expect(
    service.row({ sessionId: 'session-1', id: 'turn-1:cancel-timeout' }),
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
  const { session, stream, commands } = await openSession({
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
  expect(session.getSnapshot().context.configOptions).toMatchObject([
    {
      currentValue: 'large',
      name: 'Renamed Model',
      _meta: { argo: { heldUntilNextTurn: true } },
    },
    { currentValue: 'plan', _meta: { argo: { heldUntilNextTurn: true } } },
  ]);
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
  expect(session.getSnapshot().context.heldConfigValues).toEqual([]);
  stream.send({ type: configOptionsChangedEvent, configOptions: options });
  expect(session.getSnapshot().context.configOptions).toMatchObject([
    { currentValue: 'small' },
    { currentValue: 'auto' },
  ]);
  expect(
    session.getSnapshot().context.configOptions[1]?._meta?.argo
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
    session
      .getSnapshot()
      .context.configOptions.map(
        (option): boolean | undefined => option._meta?.argo?.heldUntilNextTurn,
      ),
  ).toEqual([undefined, undefined]);
});

it('closes after the Agent stop limit even when the Agent does not stop', async (): Promise<void> => {
  vi.useFakeTimers();
  const { session } = await openSession({
    stop: (): Promise<void> => new Promise((): void => {}),
  });
  sendSessionCommand(session, { type: sessionCloseEvent });
  await vi.advanceTimersByTimeAsync(4999);
  expect(session.getSnapshot().status).toBe('active');
  await vi.advanceTimersByTimeAsync(1);
  expect(session.getSnapshot().output).toEqual({ failure: null });
});

const { database, directory: runtimeDirectory, remove } = openTestDatabase();
const data = {
  sessionId: 'session-1',
  projectId: 'project-1',
  agent: 'mock',
  vendorSessionId: null,
  checkout: { path: '/project', branch: null },
  epoch: 0,
  maxRevision: 0,
  nextPosition: 0,
};
let stream: MockAgentStream | undefined;
let modelCommands: AgentCommand[] = [];
const ready = mockReadyEvent;
const adapter = createMockAdapter({
  stream: (value): (() => void) => {
    stream = value;
    value.receive((command): number => modelCommands.push(command));
    return (): void => {
      if (stream === value) stream = undefined;
    };
  },
  stop: (): Promise<void> => new Promise((): void => {}),
});
const machine = sessionMachine.provide({
  actors: {
    createCheckout: fromPromise(
      (): Promise<import('./session-data').SessionData> =>
        new Promise((): void => {}),
    ),
    discardCheckout: fromPromise(
      (): Promise<void> => new Promise((): void => {}),
    ),
    loadSession: fromPromise(
      (): Promise<import('./session-data').SessionData> =>
        new Promise((): void => {}),
    ),
    agent: agentMachine.provide({ actions: { sendReady: (): void => {} } }),
    feed: feedMachine.provide({
      actions: {
        sendToWriter: (): void => {},
        log: (): void => {},
      },
    }),
  },
  actions: {
    flushFeed: (): void => {},
    logMessageRejected: (): void => {},
  },
});
type SessionSnapshot = SnapshotFrom<typeof machine>;
type SessionEvent = EventFromLogic<typeof machine>;
const events = [
  { type: 'xstate.done.actor.createCheckout', output: data },
  { type: 'xstate.error.actor.createCheckout', error: 'Could not create' },
  { type: 'xstate.done.actor.discardCheckout' },
  { type: 'xstate.error.actor.discardCheckout', error: 'Could not remove' },
  { type: 'xstate.done.actor.loadSession', output: data },
  { type: 'xstate.error.actor.loadSession', error: 'Could not load' },
  { type: 'xstate.error.actor.feed', error: 'Feed failed' },
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
  { type: answerPermissionEvent, toolCallId: 'tool-1', optionId: null },
  {
    type: elicitationRequestedEvent,
    request: {
      mode: 'form',
      message: fileQuestion,
      requestedSchema: { properties: {} },
    },
  },
  { type: answerElicitationEvent, action: 'cancel' },
  { type: agentTurnEndedEvent, stopReason: 'end_turn' },
  { type: sessionCancelEvent },
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
  { type: 'xstate.done.actor.agent', output: { failure: null } },
  { type: 'xstate.error.actor.agent', error: 'Agent crashed' },
  { type: 'xstate.done.actor.feed' },
  { type: 'xstate.after.checkoutLimit.session.creating' },
  { type: 'xstate.after.cancelLimit.session.open.live.cancelling' },
  { type: 'xstate.after.agentStopLimit.session.open.live.closing' },
  { type: 'xstate.after.agentRestartDelay.session.open.recovering' },
  { type: 'xstate.after.feedFlushLimit.session.open.flushing' },
] as AnyEventObject[] as SessionEvent[];
const key = (snapshot: SessionSnapshot | undefined): string | undefined =>
  snapshot &&
  JSON.stringify({
    value: snapshot.value,
    permissions: snapshot.context.permissionQueue.length,
    elicitation: snapshot.context.pendingElicitation !== null,
    crashes: snapshot.context.agentCrashes.length,
    stored: snapshot.context.stored,
  });
const logic = machine as unknown as ActorLogic<
  SessionSnapshot,
  SessionEvent,
  SessionMachineInput
>;
const models = (['new', 'existing'] as const).map(
  (kind): TestModel<SessionSnapshot, SessionEvent, SessionMachineInput> =>
    new TestModel<SessionSnapshot, SessionEvent, SessionMachineInput>(logic, {
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
        snapshot.can(event) &&
        (event.type !== permissionRequestedEvent ||
          snapshot.context.permissionQueue.length < 2),
      serializeState: (snapshot, event, previous): string =>
        JSON.stringify({
          key: key(snapshot),
          via: event && `${key(previous)} ${event.type}`,
        }),
    }),
);
const paths = models.flatMap(
  (model): ReturnType<typeof model.getShortestPaths> =>
    model.getShortestPaths(),
);

it.each(
  paths.map(
    (path, index): readonly [number, typeof path] => [index, path] as const,
  ),
)(
  'walks Session model path %i with the mock Agent',
  async (_, path): Promise<void> => {
    vi.useFakeTimers();
    stream = undefined;
    modelCommands = [];
    const input = path.steps[0]?.state.context.input;
    if (!input) throw new Error('No model input');
    // The model writer holds jobs so paths cannot alter the database.
    const root = createActor(
      setup({
        actors: {
          session: machine,
          writer: writerMachine.provide({
            actors: {
              writeBatch: fromPromise(
                (): Promise<void> => new Promise((): void => {}),
              ),
            },
          }),
        },
      }).createMachine({
        invoke: [
          {
            id: 'writer',
            systemId: databaseWriterId,
            src: 'writer',
            input: { database, now: (): number => 1000 },
          },
          { id: 'session', src: 'session', input },
        ],
      }),
    ).start();
    actors.push(root);
    const sessionActor = root.getSnapshot().children.session;
    if (!sessionActor) throw new Error('No Session actor');
    const executors = Object.fromEntries(
      events.map(
        ({
          type,
        }): [
          SessionEvent['type'],
          (args: { event: SessionEvent }) => Promise<void>,
        ] => [
          type,
          async ({ event }: { event: SessionEvent }): Promise<void> => {
            const before = sessionActor.getSnapshot();
            const commandIndex = modelCommands.length;
            if (
              event.type.startsWith('agent.') &&
              event.type !== 'agent.ready' &&
              stream
            )
              stream.send(event as MockAgentStreamEvent);
            else sessionActor.send(event);
            await vi.advanceTimersByTimeAsync(0);
            if (
              event.type === sessionPromptEvent &&
              before.can(event) &&
              before.context.heldConfigValues.length
            )
              expect(modelCommands.slice(commandIndex)).toEqual([
                {
                  type: agentSetConfigEvent,
                  configId: 'mode',
                  value: 'plan',
                },
                { ...event, type: agentPromptEvent },
              ]);
            if (String(event.type) === 'xstate.error.actor.feed')
              expect(sessionActor.getSnapshot().output).toEqual({
                failure: 'Feed failed',
              });
          },
        ],
      ),
    );
    await path.test({
      events: executors,
      states: {
        '*': (expected): void => {
          const actual = sessionActor.getSnapshot();
          expect(actual.context.heldConfigValues).toEqual(
            expected.context.heldConfigValues,
          );
          expect(actual.context.rejectedMessages).toBe(
            expected.context.rejectedMessages,
          );
          const feed = actual.children.feed;
          const { epoch, maxRevision, liveHeader, ...projection } =
            toSessionSnapshot(
              expected,
              { context: expected.context },
              sessionRows.idle,
            );
          expect(
            toSessionSnapshot(
              actual,
              feed?.getSnapshot() ?? { context: { epoch, maxRevision } },
              sessionRows.idle,
            ),
          ).toMatchObject({
            ...projection,
            pendingElicitation: projection.pendingElicitation && {
              ...projection.pendingElicitation,
              requestId: requestModel,
            },
            liveHeader: liveHeader && {
              ...liveHeader,
              startedAt: liveHeader.startedAt === null ? null : 1000,
            },
          });
        },
      },
    });
  },
);

it('ends Checkout creation with a retryable failure when git does not finish', async (): Promise<void> => {
  vi.useFakeTimers();
  const actor = createActor(machine, {
    input: {
      now: (): number => Date.now(),
      createId: randomUUID,
      database,
      runtimeDirectory,
      adapter,
      kind: 'new',
      sessionId: 'session-blocked',
      projectId: 'project-1',
      projectPath: '/project',
      agent: 'mock',
      checkout: { type: 'worktree', baseBranch: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Build it' }],
      turnId: 'turn-blocked',
    },
  }).start();
  actors.push(actor);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(actor.getSnapshot().status).toBe('done');
  expect(actor.getSnapshot().output).toEqual({
    failure:
      'Checkout creation exceeded checkoutLimit (10000 ms). Retry the Session.',
  });
});

it('the generated paths walk every reachable transition', (): void => {
  expect(
    unwalkedTransitions({
      models,
      paths,
      stateKey: (snapshot): string => String(key(snapshot)),
      eventKey: (event): typeof event.type => event.type,
    }),
  ).toEqual([]);
});

it('attaches live Feed updates when a subscription starts while the Session loads', async (): Promise<void> => {
  vi.useFakeTimers();
  const { database, remove } = openTestDatabase();
  cleanups.push(remove);
  const adapter = createMockAdapter({
    stream: (): undefined => {},
  });
  const {
    root,
    session: sessionActor,
    service,
  } = createSessionHost(database, adapter);
  cleanups.push((): typeof root => root.stop());
  const { updates } = subscribeToSession(service);
  expect((await updates.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { maxRevision: 0 },
  });
  await waitFor(sessionActor, (snapshot): boolean =>
    snapshot.can({ type: sessionPromptEvent, turnId: 'turn-1', content: [] }),
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
