import type { AgentReady, VendorCommand } from '@repo/agents';
import { permissionOptions } from '@repo/contracts';
import {
  createMockAdapter,
  mockReady,
  type MockAgentStream,
} from '@repo/mocks/agent';
import { expect, it, vi } from 'vitest';
import { createRouterHost } from '#mocks/router';

const alreadyAnswered = 'already answered';

async function answering(ready: AgentReady = mockReady): Promise<
  ReturnType<typeof createRouterHost> & {
    stream: MockAgentStream;
    commands: VendorCommand[];
  }
> {
  let stream: MockAgentStream | undefined;
  const commands: VendorCommand[] = [];
  const host = createRouterHost({
    adapters: [
      createMockAdapter({
        connect: async (): Promise<AgentReady> => ready,
        stream: (connected): undefined => {
          stream = connected;
          connected.receive((command): number => commands.push(command));
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

it('answers only the current Permission and preserves its option and feedback', async (): Promise<void> => {
  const { caller, stream, commands } = await answering();
  stream.send({
    type: 'agent.permissionRequested',
    request: {
      toolCallId: 'current',
      title: 'Run command',
      options: permissionOptions,
    },
  });
  expect(
    await caller.session.answerPermission({
      sessionId: 'session-1',
      toolCallId: 'current',
      optionId: 'reject_once',
      message: 'Use a safer command',
    }),
  ).toEqual({});
  await vi.waitFor((): void =>
    expect(commands).toContainEqual({
      type: 'agent.answerPermission',
      toolCallId: 'current',
      optionId: 'reject_once',
      message: 'Use a safer command',
    }),
  );
  await expect(
    caller.session.answerPermission({
      sessionId: 'session-1',
      toolCallId: 'current',
      optionId: 'allow_once',
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT', message: alreadyAnswered });
});

it('rejects unsupported Permission feedback without consuming the request', async (): Promise<void> => {
  const { caller, stream } = await answering({
    ...mockReady,
    capabilities: { ...mockReady.capabilities, permissionFeedback: false },
  });
  stream.send({
    type: 'agent.permissionRequested',
    request: {
      toolCallId: 'current',
      title: 'Run command',
      options: permissionOptions,
    },
  });
  await expect(
    caller.session.answerPermission({
      sessionId: 'session-1',
      toolCallId: 'current',
      optionId: 'reject_once',
      message: 'Feedback',
    }),
  ).rejects.toMatchObject({
    code: 'BAD_REQUEST',
    message: 'The Agent does not support Permission feedback',
  });
  expect(
    await caller.session.answerPermission({
      sessionId: 'session-1',
      toolCallId: 'current',
      optionId: 'allow_once',
    }),
  ).toEqual({});
});

it('validates Elicitation content against the current offered form before answering', async (): Promise<void> => {
  const { caller, root, stream, commands } = await answering();
  stream.send({
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
  const requestId = root
    .getSnapshot()
    .context.sessions['session-1']?.getSnapshot().context
    .pendingElicitation?.requestId;
  if (!requestId) throw new Error('No Elicitation request');
  await expect(
    caller.session.answerElicitation({
      sessionId: 'session-1',
      requestId: 'stale',
      action: 'accept',
      content: { count: 2 },
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT', message: alreadyAnswered });
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
  await expect(
    caller.session.answerElicitation({
      sessionId: 'session-1',
      requestId,
      action: 'cancel',
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT', message: alreadyAnswered });
});

it('returns held boolean and grouped select choices and rejects unoffered values', async (): Promise<void> => {
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
  const { caller, commands } = await answering({ ...mockReady, configOptions });
  expect(
    await caller.session.setConfigOption({
      sessionId: 'session-1',
      configId: 'fast',
      type: 'boolean',
      value: true,
    }),
  ).toMatchObject({
    configOptions: [
      { configId: 'fast', currentValue: true },
      { configId: 'model' },
    ],
  });
  expect(
    await caller.session.setConfigOption({
      sessionId: 'session-1',
      configId: 'model',
      type: 'id',
      value: 'large',
    }),
  ).toMatchObject({
    configOptions: [
      { configId: 'fast', currentValue: true },
      { configId: 'model', currentValue: 'large' },
    ],
  });
  await expect(
    caller.session.setConfigOption({
      sessionId: 'session-1',
      configId: 'fast',
      type: 'id',
      value: 'true',
    }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  await expect(
    caller.session.setConfigOption({
      sessionId: 'session-1',
      configId: 'model',
      type: 'id',
      value: 'unknown',
    }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  expect(
    commands.filter(
      (command): boolean => command.type === 'agent.setConfigOption',
    ),
  ).toEqual([]);
});

it('lists stored Sessions with both supported paging inputs through the real router', async (): Promise<void> => {
  const { caller, root } = createRouterHost();
  const expected = await caller.session.list({ archived: false });
  expect(expected).toMatchObject({
    sessions: [{ sessionId: 'session-1' }],
    nextCursor: null,
  });
  expect(
    await caller.session.list({ archived: false, direction: 'forward' }),
  ).toEqual(expected);
  expect(root.getSnapshot().context.sessions).toEqual({});
  await expect(
    Reflect.apply(caller.session.list, undefined, [
      { archived: false, direction: 'backward' },
    ]),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});

it('preserves the four unimplemented-operation errors and still validates their inputs', async (): Promise<void> => {
  const { caller } = createRouterHost();
  await expect(
    caller.session.rename({ sessionId: 'session-1', title: 'New title' }),
  ).rejects.toMatchObject({
    code: 'NOT_IMPLEMENTED',
    message: 'Session rename is not implemented yet',
  });
  await expect(
    caller.session.answerPlanProposal({
      sessionId: 'session-1',
      planId: 'plan',
      decision: 'approve',
    }),
  ).rejects.toMatchObject({
    code: 'NOT_IMPLEMENTED',
    message: 'Plan proposal answers are not implemented yet',
  });
  await expect(
    caller.session.changes({ sessionId: 'session-1' }),
  ).rejects.toMatchObject({
    code: 'NOT_IMPLEMENTED',
    message: 'This procedure is not implemented yet',
  });
  await expect(
    caller.session.diff({ sessionId: 'session-1', path: 'file.ts' }),
  ).rejects.toMatchObject({
    code: 'NOT_IMPLEMENTED',
    message: 'This procedure is not implemented yet',
  });
  await expect(
    Reflect.apply(caller.session.rename, undefined, [
      { sessionId: 'session-1', title: 42 },
    ]),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});
