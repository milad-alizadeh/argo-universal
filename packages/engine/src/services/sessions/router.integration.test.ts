import type { AgentReady, VendorCommand } from '@repo/agents';
import {
  permissionOptions,
  type SessionSnapshot,
  type SessionAnswerElicitationInput,
  type SessionSetConfigOptionInput,
  type SessionListInput,
} from '@repo/contracts';
import {
  createMockAdapter,
  mockReady,
  type MockAgentScript,
  type MockAgentStream,
} from '@repo/mocks/agent';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

const alreadyAnswered = 'already answered';
const permissionAnswer = 'agent.answerPermission';

async function readSessionSnapshot(
  subscribeToFeed: Awaited<
    ReturnType<typeof startEngineTestHost>
  >['caller']['feed']['subscribe'],
): Promise<SessionSnapshot> {
  const events = await subscribeToFeed({ sessionId: 'session-1', after: null });
  for await (const event of events)
    if (event.type === 'snapshot') return event.snapshot;
  throw new Error('No Session snapshot');
}

async function startPromptedSession(
  agentReady: AgentReady = mockReady,
): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>> & {
    stream: MockAgentStream;
    commands: VendorCommand[];
  }
> {
  let stream: MockAgentStream | undefined;
  const commands: VendorCommand[] = [];
  const host = await startEngineTestHost({
    adapters: [
      createMockAdapter({
        connect: async (): Promise<AgentReady> => agentReady,
        stream: (agentStream): undefined => {
          stream = agentStream;
          agentStream.receive((command): number => commands.push(command));
        },
      }),
    ],
  });
  await host.caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Start' }],
  });
  if (!stream) throw new Error('No Agent stream');
  return { ...host, stream, commands };
}

async function startPermissionRequestSession(
  agentReady: AgentReady = mockReady,
): Promise<
  Awaited<ReturnType<typeof startPromptedSession>> & { requestId: string }
> {
  const host = await startPromptedSession(agentReady);
  host.stream.send({
    type: 'agent.permissionRequested',
    request: {
      toolCallId: 'current',
      title: 'Run command',
      options: permissionOptions,
    },
  });
  const requestId = (await readSessionSnapshot(host.caller.feed.subscribe))
    .pendingPermission?.requestId;
  if (!requestId) throw new Error('No Permission request');
  return { ...host, requestId };
}

async function startAnsweredPermissionSession(): Promise<
  Awaited<ReturnType<typeof startPermissionRequestSession>>
> {
  const host = await startPermissionRequestSession();
  await host.caller.session.answerPermission({
    sessionId: 'session-1',
    requestId: host.requestId,
    optionId: 'allow_once',
  });
  return host;
}

it('preserves the current Permission option and feedback when answering', async (): Promise<void> => {
  const { caller, commands, requestId } = await startPermissionRequestSession();
  expect(
    await caller.session.answerPermission({
      sessionId: 'session-1',
      requestId,
      optionId: 'reject_once',
      message: 'Use a safer command',
    }),
  ).toEqual({});
  await vi.waitFor((): void =>
    expect(commands).toContainEqual({
      type: permissionAnswer,
      toolCallId: 'current',
      optionId: 'reject_once',
      message: 'Use a safer command',
    }),
  );
});

it('rejects an already answered Permission', async (): Promise<void> => {
  const { caller, requestId } = await startAnsweredPermissionSession();
  await expect(
    caller.session.answerPermission({
      sessionId: 'session-1',
      requestId,
      optionId: 'allow_once',
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT', message: alreadyAnswered });
});

it('rejects unsupported Permission feedback without consuming the request', async (): Promise<void> => {
  const { caller, commands, requestId } = await startPermissionRequestSession({
    ...mockReady,
    capabilities: { ...mockReady.capabilities, permissionFeedback: false },
  });
  await expect(
    caller.session.answerPermission({
      sessionId: 'session-1',
      requestId,
      optionId: 'reject_once',
      message: 'Feedback',
    }),
  ).rejects.toMatchObject({
    code: 'BAD_REQUEST',
    message: 'The Agent does not support Permission feedback',
  });
  expect(
    (await readSessionSnapshot(caller.feed.subscribe)).pendingPermission,
  ).toMatchObject({
    toolCallId: 'current',
  });
  expect(
    commands.some((command): boolean => command.type === permissionAnswer),
  ).toBe(false);
});

it('answers a Permission without feedback when feedback is unsupported', async (): Promise<void> => {
  const { caller, commands, requestId } = await startPermissionRequestSession({
    ...mockReady,
    capabilities: { ...mockReady.capabilities, permissionFeedback: false },
  });
  expect(
    await caller.session.answerPermission({
      sessionId: 'session-1',
      requestId,
      optionId: 'allow_once',
    }),
  ).toEqual({});
  await vi.waitFor((): void =>
    expect(commands).toContainEqual({
      type: permissionAnswer,
      toolCallId: 'current',
      optionId: 'allow_once',
      message: undefined,
    }),
  );
});

async function startElicitationRequestSession(): Promise<
  Awaited<ReturnType<typeof startPromptedSession>> &
    Pick<SessionAnswerElicitationInput, 'requestId'>
> {
  const host = await startPromptedSession();
  host.stream.send({
    type: 'agent.elicitationRequested',
    request: {
      mode: 'form',
      message: 'Choose a number',
      requestedSchema: {
        properties: { count: { type: 'integer', minimum: 1, maximum: 3 } },
        required: ['count'],
      },
    },
  });
  const requestId = (await readSessionSnapshot(host.caller.feed.subscribe))
    .pendingElicitation?.requestId;
  if (!requestId) throw new Error('No Elicitation request');
  return { ...host, requestId };
}

async function startAnsweredElicitationSession(): Promise<
  Awaited<ReturnType<typeof startElicitationRequestSession>>
> {
  const host = await startElicitationRequestSession();
  await host.caller.session.answerElicitation({
    sessionId: 'session-1',
    requestId: host.requestId,
    action: 'accept',
    content: { count: 2 },
  });
  return host;
}

it('rejects a stale Elicitation identity', async (): Promise<void> => {
  const { caller } = await startElicitationRequestSession();
  await expect(
    caller.session.answerElicitation({
      sessionId: 'session-1',
      requestId: 'stale',
      action: 'accept',
      content: { count: 2 },
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT', message: alreadyAnswered });
});

it('rejects content outside the offered Elicitation form without consuming it', async (): Promise<void> => {
  const { caller, requestId } = await startElicitationRequestSession();
  await expect(
    caller.session.answerElicitation({
      sessionId: 'session-1',
      requestId,
      action: 'accept',
      content: { count: 'wrong type' },
    }),
  ).rejects.toMatchObject({
    code: 'BAD_REQUEST',
    message: 'The answer does not match the Elicitation form',
  });
  expect(
    (await readSessionSnapshot(caller.feed.subscribe)).pendingElicitation
      ?.requestId,
  ).toBe(requestId);
});

it('delivers a valid current Elicitation answer', async (): Promise<void> => {
  const { caller, requestId, commands } =
    await startElicitationRequestSession();
  expect(
    await caller.session.answerElicitation({
      sessionId: 'session-1',
      requestId,
      action: 'accept',
      content: { count: 2 },
    }),
  ).toEqual({});
  await vi.waitFor((): void =>
    expect(commands).toContainEqual({
      type: 'agent.answerElicitation',
      action: 'accept',
      content: { count: 2 },
    }),
  );
});

it('rejects an already answered Elicitation', async (): Promise<void> => {
  const { caller, requestId } = await startAnsweredElicitationSession();
  await expect(
    caller.session.answerElicitation({
      sessionId: 'session-1',
      requestId,
      action: 'cancel',
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT', message: alreadyAnswered });
});

const configOptions: AgentReady['configOptions'] = [
  { configId: 'fast', name: 'Fast', type: 'boolean', currentValue: false },
  {
    configId: 'model',
    name: 'Model',
    type: 'select',
    currentValue: 'small',
    options: [
      {
        groupId: 'models',
        name: 'Models',
        options: [
          { value: 'small', name: 'Small' },
          { value: 'large', name: 'Large' },
        ],
      },
    ],
  },
];
const heldChoices: SessionSetConfigOptionInput[] = [
  { sessionId: 'session-1', configId: 'fast', type: 'boolean', value: true },
  { sessionId: 'session-1', configId: 'model', type: 'id', value: 'large' },
];
it.each(heldChoices)(
  'returns the held $configId choice',
  async (input): Promise<void> => {
    const { caller, commands } = await startPromptedSession({
      ...mockReady,
      configOptions,
    });
    const response = await caller.session.setConfigOption(input);
    expect(
      response.configOptions.find(
        (option): boolean => option.configId === input.configId,
      )?.currentValue,
    ).toBe(input.value);
    expect(
      commands.some(
        (command): boolean => command.type === 'agent.setConfigOption',
      ),
    ).toBe(false);
  },
);

const unofferedChoices: SessionSetConfigOptionInput[] = [
  { sessionId: 'session-1', configId: 'fast', type: 'id', value: 'true' },
  { sessionId: 'session-1', configId: 'model', type: 'id', value: 'unknown' },
];
it.each(unofferedChoices)(
  'rejects the unoffered $configId=$value choice',
  async (input): Promise<void> => {
    const { caller } = await startPromptedSession({
      ...mockReady,
      configOptions,
    });
    await expect(caller.session.setConfigOption(input)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  },
);

const pagingInputs: SessionListInput[] = [
  { archived: false },
  { archived: false, direction: 'forward' },
];
it.each(pagingInputs)(
  'lists stored Sessions without starting their Agent: %j',
  async (input): Promise<void> => {
    const connect = vi
      .fn<NonNullable<MockAgentScript['connect']>>()
      .mockResolvedValue(mockReady);
    const { caller } = await startEngineTestHost({
      adapters: [createMockAdapter({ connect })],
    });
    expect(await caller.session.list(input)).toMatchObject({
      sessions: [{ sessionId: 'session-1' }],
      nextCursor: null,
    });
    expect(connect).not.toHaveBeenCalled();
  },
);

it('rejects an unsupported Session paging direction', async (): Promise<void> => {
  const { caller } = await startEngineTestHost();
  await expect(
    Reflect.apply(caller.session.list, undefined, [
      { archived: false, direction: 'backward' },
    ]),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});

it.each([
  {
    procedure: 'rename',
    input: { sessionId: 'session-1', title: 'New title' },
    message: 'Session rename is not implemented yet',
  },
  {
    procedure: 'answerPlanProposal',
    input: { sessionId: 'session-1', planId: 'plan', decision: 'approve' },
    message: 'Plan proposal answers are not implemented yet',
  },
  {
    procedure: 'changes',
    input: { sessionId: 'session-1' },
    message: 'This procedure is not implemented yet',
  },
  {
    procedure: 'diff',
    input: { sessionId: 'session-1', path: 'file.ts' },
    message: 'This procedure is not implemented yet',
  },
] as const)(
  'preserves the unimplemented $procedure error',
  async ({ procedure, input, message }): Promise<void> => {
    const { caller } = await startEngineTestHost();
    await expect(
      Reflect.apply(caller.session[procedure], undefined, [input]),
    ).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED', message });
  },
);

it.each([
  { sessionId: 'session-1' },
  { sessionId: 'session-1', title: 42 },
  { sessionId: 'session-1', title: 'New title', titleSource: 'manual' },
])(
  'rejects a malformed rename input before its handler: %j',
  async (input): Promise<void> => {
    const { caller } = await startEngineTestHost();
    await expect(
      Reflect.apply(caller.session.rename, undefined, [input]),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  },
);
