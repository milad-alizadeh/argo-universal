import {
  agentAdapters,
  type AgentReady,
  type VendorCommand,
} from '@repo/agents';
import { session } from '@repo/db/schema';
import { createMockAdapter, mockReady } from '@repo/mocks/agent';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

const identities = agentAdapters.map((adapter): string => adapter.agent);
const ready: AgentReady = {
  ...mockReady,
  configOptions: [
    { configId: 'fast', name: 'Fast', type: 'boolean', currentValue: false },
  ],
};
const promptCommand = 'agent.prompt';
const prompt = [{ type: 'text', text: 'Continue' }] as const;

async function startAdmittedSession(agent: string): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>> & {
    commands: VendorCommand[];
  }
> {
  const commands: VendorCommand[] = [];
  const host = await startEngineTestHost({
    adapters: [
      createMockAdapter(
        {
          connect: async (): Promise<AgentReady> => ready,
          stream: (stream): undefined => {
            stream.receive((command): number => commands.push(command));
          },
        },
        agent,
      ),
    ],
  });
  host.database.update(session).set({ agent }).run();
  await host.caller.session.setConfigOption({
    sessionId: 'session-1',
    configId: 'fast',
    type: 'boolean',
    value: false,
  });
  return { ...host, commands };
}

it.each(identities)(
  'keeps the admitted %s Session eligible after an unsupported stored reparent',
  async (agent): Promise<void> => {
    const { database, caller, commands } = await startAdmittedSession(agent);
    database
      .update(session)
      .set({ parentSessionId: 'session-1' })
      .where(eq(session.id, 'session-1'))
      .run();
    const acknowledgement = await caller.session.prompt({
      sessionId: 'session-1',
      prompt: [...prompt],
    });
    expect(acknowledgement.messageId).toEqual(expect.any(String));
    await vi.waitFor((): void => {
      expect(
        commands.filter((command): boolean => command.type === promptCommand),
      ).toEqual([
        {
          type: promptCommand,
          turnId: expect.any(String),
          content: [...prompt],
        },
      ]);
    });
  },
);

const absentCommands = [
  {
    name: 'cancel',
    code: 'NOT_FOUND',
    message: 'No Session session-1',
    call: (
      caller: Awaited<ReturnType<typeof startEngineTestHost>>['caller'],
    ): ReturnType<typeof caller.session.cancel> =>
      caller.session.cancel({ sessionId: 'session-1' }),
  },
  {
    name: 'Permission answer',
    code: 'CONFLICT',
    message: 'already answered',
    call: (
      caller: Awaited<ReturnType<typeof startEngineTestHost>>['caller'],
    ): ReturnType<typeof caller.session.answerPermission> =>
      caller.session.answerPermission({
        sessionId: 'session-1',
        toolCallId: 'stale',
        optionId: 'allow_once',
      }),
  },
  {
    name: 'Elicitation answer',
    code: 'CONFLICT',
    message: 'already answered',
    call: (
      caller: Awaited<ReturnType<typeof startEngineTestHost>>['caller'],
    ): ReturnType<typeof caller.session.answerElicitation> =>
      caller.session.answerElicitation({
        sessionId: 'session-1',
        requestId: 'stale',
        action: 'cancel',
      }),
  },
];

it.each(
  identities.flatMap(
    (agent): ((typeof absentCommands)[number] & { agent: string })[] =>
      absentCommands.map((command): typeof command & { agent: string } => ({
        ...command,
        agent,
      })),
  ),
)(
  'rejects an absent $agent Session $name without starting native work',
  async ({ agent, code, message, call }): Promise<void> => {
    const connect = vi.fn<() => Promise<AgentReady>>().mockResolvedValue(ready);
    const { caller, database } = await startEngineTestHost({
      adapters: [createMockAdapter({ connect }, agent)],
    });
    database.update(session).set({ agent }).run();
    await expect(call(caller)).rejects.toMatchObject({ code, message });
    expect(connect).not.toHaveBeenCalled();
  },
);

it.each(identities)(
  'rejects a %s prompt when initial startup enters recovery without waiting for a retry',
  async (agent): Promise<void> => {
    const connect = vi
      .fn<() => Promise<AgentReady>>()
      .mockRejectedValue(new Error('Native startup failed'));
    const { caller, database } = await startEngineTestHost({
      adapters: [createMockAdapter({ connect }, agent)],
    });
    database.update(session).set({ agent }).run();
    await expect(
      caller.session.prompt({ sessionId: 'session-1', prompt: [...prompt] }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: expect.stringContaining('recovering'),
    });
    expect(connect).toHaveBeenCalledTimes(1);
  },
);

it.each(identities)(
  'shares initial %s startup for overlapping cold prompts and acknowledges only the admitted Turn',
  async (agent): Promise<void> => {
    const startup = Promise.withResolvers<AgentReady>();
    const began = Promise.withResolvers<void>();
    const commands: VendorCommand[] = [];
    const connect = vi.fn<() => Promise<AgentReady>>(
      (): Promise<AgentReady> => {
        began.resolve();
        return startup.promise;
      },
    );
    const { caller, database } = await startEngineTestHost({
      adapters: [
        createMockAdapter(
          {
            connect,
            stream: (stream): undefined => {
              stream.receive((command): number => commands.push(command));
            },
          },
          agent,
        ),
      ],
    });
    database.update(session).set({ agent }).run();
    const first = caller.session.prompt({
      sessionId: 'session-1',
      prompt: [...prompt],
    });
    const second = caller.session.prompt({
      sessionId: 'session-1',
      prompt: [...prompt],
    });
    const outcomes = Promise.allSettled([first, second]);
    await began.promise;
    startup.resolve(ready);
    const results = await outcomes;
    expect(results.map((result): string => result.status)).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(results[0]).toMatchObject({
      value: { messageId: expect.any(String) },
    });
    expect(results[1]).toMatchObject({
      reason: { code: 'CONFLICT', message: expect.stringContaining('running') },
    });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(commands).toEqual([
      {
        type: promptCommand,
        turnId: expect.any(String),
        content: [...prompt],
      },
    ]);
  },
);

it.each(identities)(
  'rejects a %s prompt while native closure remains pending',
  async (agent): Promise<void> => {
    const stopped = Promise.withResolvers<void>();
    onTestFinished((): void => stopped.resolve());
    const began = Promise.withResolvers<void>();
    const commands: VendorCommand[] = [];
    const host = await startEngineTestHost({
      adapters: [
        createMockAdapter(
          {
            connect: async (): Promise<AgentReady> => ready,
            stop: (): Promise<void> => {
              began.resolve();
              return stopped.promise;
            },
            stream: (stream): undefined => {
              stream.receive((command): number => commands.push(command));
            },
          },
          agent,
        ),
      ],
    });
    host.database.update(session).set({ agent }).run();
    await host.caller.session.setConfigOption({
      sessionId: 'session-1',
      configId: 'fast',
      type: 'boolean',
      value: false,
    });
    const closure = host.caller.session.close({ sessionId: 'session-1' });
    await began.promise;
    await expect(
      host.caller.session.prompt({
        sessionId: 'session-1',
        prompt: [...prompt],
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: expect.stringContaining('draining'),
    });
    expect(
      commands.filter((command): boolean => command.type === promptCommand),
    ).toEqual([]);
    stopped.resolve();
    await closure;
  },
);

it.each(identities)(
  'rejects the waiting %s prompt when Engine shutdown starts',
  async (agent): Promise<void> => {
    const startup = Promise.withResolvers<AgentReady>();
    const began = Promise.withResolvers<void>();
    const commands: VendorCommand[] = [];
    const { caller, database, engine } = await startEngineTestHost({
      adapters: [
        createMockAdapter(
          {
            connect: (): Promise<AgentReady> => {
              began.resolve();
              return startup.promise;
            },
            stream: (stream): undefined => {
              stream.receive((command): number => commands.push(command));
            },
          },
          agent,
        ),
      ],
    });
    database.update(session).set({ agent }).run();
    const outcome = caller.session.prompt({
      sessionId: 'session-1',
      prompt: [...prompt],
    });
    const rejected = outcome.catch((error: unknown): unknown => error);
    await began.promise;
    engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
    startup.resolve(ready);
    expect(await rejected).toMatchObject({
      code: 'CONFLICT',
      message: 'The Engine is stopping',
    });
    expect(commands).toEqual([]);
  },
);
