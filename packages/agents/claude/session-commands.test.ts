import type { Query } from '@anthropic-ai/claude-agent-sdk';
import { expect, it, vi, type Mock } from 'vitest';
import { UnsupportedCommandError } from '../src/agent-adapter';
import type { AgentEvent } from '../src/agent-events';
import { startingValues } from './config-options';
import { models } from './mocks/config-models';
import { permission } from './mocks/requests';
import { createPromptQueue } from './prompt-queue';
import { createRequestTracker } from './request-tracker';
import { sessionCommands } from './session-commands';
import { createSessionLifetime } from './session-lifetime';

type SdkCommandMocks = {
  [Method in keyof Parameters<typeof sessionCommands>[0]['vendor']]: Mock<
    Query[Method]
  >;
};
function createSdkCommandPort(): SdkCommandMocks {
  return {
    interrupt: vi.fn<Query['interrupt']>(async (): Promise<undefined> => {}),
    setModel: vi.fn<Query['setModel']>().mockResolvedValue(),
    setPermissionMode: vi.fn<Query['setPermissionMode']>().mockResolvedValue(),
    applyFlagSettings: vi.fn<Query['applyFlagSettings']>().mockResolvedValue(),
  };
}
function createCommandResources(
  events: AgentEvent[] = [],
): Omit<Parameters<typeof sessionCommands>[0], 'vendor'> {
  const listener: Parameters<typeof sessionCommands>[0]['listener'] = {
    message: (): void => {},
    event: (event): void => {
      events.push(event);
    },
    failed: (): void => {},
  };
  const queue = createPromptQueue();
  const requests = createRequestTracker(listener);
  return {
    listener,
    queue,
    requests,
    lifetime: createSessionLifetime(
      new AbortController().signal,
      queue,
      requests,
    ),
    models,
    values: startingValues(models, []),
  };
}

it('dispatches the prompt before native cancellation', async (): Promise<void> => {
  const resources = createCommandResources();
  const vendor = createSdkCommandPort();
  const calls: string[] = [];
  vi.mocked(vendor.interrupt).mockImplementation(
    async (): Promise<undefined> => {
      calls.push('interrupt');
    },
  );
  const run = sessionCommands({ ...resources, vendor });
  void run({
    type: 'agent.prompt',
    turnId: 'turn-1',
    content: [{ type: 'text', text: 'Hello' }],
  });
  const delivery = Promise.resolve().then(async (): Promise<void> => {
    await Promise.resolve();
    await resources.queue.prompts.next();
    calls.push('prompt');
    await resources.queue.prompts.return(Promise.resolve());
  });
  await run({ type: 'agent.cancel' });
  await delivery;
  expect(calls).toEqual(['prompt', 'interrupt']);
});

it('applies the requested SDK effort and publishes the selected option', async (): Promise<void> => {
  const events: AgentEvent[] = [];
  const resources = createCommandResources(events);
  const vendor = createSdkCommandPort();
  const run = sessionCommands({ ...resources, vendor });
  await run({
    type: 'agent.setConfigOption',
    configId: 'effort',
    value: 'high',
  });
  expect(vendor.applyFlagSettings).toHaveBeenCalledExactlyOnceWith({
    effortLevel: 'high',
  });
  expect(events).toEqual([
    {
      type: 'agent.configOptionsChanged',
      configOptions: expect.arrayContaining([
        expect.objectContaining({ configId: 'effort', currentValue: 'high' }),
      ]),
    },
  ]);
});

it('answers the pending SDK permission with its allowed result', async (): Promise<void> => {
  const resources = createCommandResources();
  const answered =
    Promise.withResolvers<
      import('@anthropic-ai/claude-agent-sdk').PermissionResult
    >();
  resources.requests.add(permission, answered.resolve);
  const run = sessionCommands({ ...resources, vendor: createSdkCommandPort() });
  await run({
    type: 'agent.answerPermission',
    toolCallId: 'tool',
    optionId: 'allow_once',
  });
  await expect(answered.promise).resolves.toEqual({ behavior: 'allow' });
});

it.each([
  { type: 'agent.rename', title: 'Renamed' },
  { type: 'agent.stopShell', shellId: 'shell-1' },
] as const)(
  'rejects unsupported $type through its Promise',
  async (command): Promise<void> => {
    const run = sessionCommands({
      ...createCommandResources(),
      vendor: createSdkCommandPort(),
    });
    await expect(run(command)).rejects.toBeInstanceOf(UnsupportedCommandError);
  },
);
