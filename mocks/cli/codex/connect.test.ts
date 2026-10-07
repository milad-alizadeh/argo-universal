import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AgentCommandOf, AgentEvent, VendorSession } from '@repo/agents';
import { agentMachine } from '@repo/agents';
import { afterEach, expect, it, vi } from 'vitest';
import { createActor, fromCallback, waitFor } from 'xstate';
import { codexAdapter } from '../../../packages/agents/codex/index';
import type { VendorMessage } from '../../../packages/agents/codex/messages';
import {
  type MockCliScenarioInput,
  mockCliScenarioEnvironment,
} from '../mock-cli';
import { findRecording } from '../recording';
import { writeMockCodex } from './write-mock-codex';

const cleanups: (() => void | Promise<void>)[] = [];
const cliDeadline = { timeout: 10_000 };
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

// Sets the whole scenario once, before the CLI starts.
const stubScenario = (scenario: MockCliScenarioInput) => {
  for (const [key, value] of Object.entries(
    mockCliScenarioEnvironment(scenario),
  ))
    vi.stubEnv(key, value);
};

async function prepare(recording: string) {
  const directory = mkdtempSync(path.join(tmpdir(), 'codex-cancel-'));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const executable = await writeMockCodex(directory, { recording });
  vi.stubEnv('PATH', directory);
  return { directory, executable };
}

const prompt: AgentCommandOf<'agent.prompt'> = {
  type: 'agent.prompt',
  turnId: 'turn-1',
  content: [{ type: 'text', text: 'Run a command.' }],
};

it('starts another Turn before a cancelled Turn receives its late start response', async () => {
  stubScenario({ turnResponseAfterNextStart: true });
  const { directory, executable } = await prepare('interrupt');
  const source = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    'interrupt',
  );
  const envelope = JSON.parse(readFileSync(source, 'utf8')) as {
    payload: {
      messages: VendorMessage[];
    };
  };
  const identifiers = new Set(
    envelope.payload.messages.flatMap((message) => {
      if (
        message.method === 'turn/started' ||
        message.method === 'turn/completed'
      )
        return [message.params.turn.id];
      if (
        message.method === 'item/started' ||
        message.method === 'item/completed'
      )
        return [message.params.item.id];
      return [];
    }),
  );
  const next = envelope.payload.messages.map((message) => {
    let text = JSON.stringify(message);
    for (const id of identifiers) text = text.replaceAll(id, `${id}-next`);
    return JSON.parse(text);
  });
  envelope.payload.messages.push(...next);
  const recordingDirectory = path.join(
    directory,
    path.basename(path.dirname(source)),
  );
  mkdirSync(recordingDirectory);
  const repeated = path.join(recordingDirectory, 'two-turns.json');
  writeFileSync(repeated, JSON.stringify(envelope));
  writeFileSync(
    executable,
    readFileSync(executable, 'utf8').replace(source, repeated),
  );

  const events: AgentEvent[] = [];
  const parent = createActor(
    fromCallback<AgentEvent>(({ receive }) =>
      receive((event) => events.push(event)),
    ),
  ).start();
  cleanups.push(() => {
    parent.stop();
  });
  const agent = createActor(agentMachine, {
    input: {
      adapter: codexAdapter,
      sessionId: 'session',
      cwd: directory,
      vendorSessionId: null,
      configOptions: [],
      parent,
    },
  }).start();
  cleanups.push(async () => {
    agent.send({ type: 'agent.stop' });
    await waitFor(agent, (snapshot) => snapshot.status === 'done', {
      timeout: 10_000,
    });
  });
  await expect
    .poll(
      () => events.some((event) => event.type === 'agent.ready'),
      cliDeadline,
    )
    .toBe(true);
  agent.send(prompt);
  agent.send({ type: 'agent.cancel' });
  const ended = () =>
    events.filter((event) => event.type === 'agent.turnEnded');
  await expect.poll(() => ended().length, cliDeadline).toBe(1);
  agent.send({ ...prompt, turnId: 'turn-2' });
  await expect
    .poll(
      () => events.filter((event) => event.type === 'agent.turnStarted').length,
      cliDeadline,
    )
    .toBe(2);
  agent.send({ type: 'agent.cancel' });
  await expect.poll(() => ended().length, cliDeadline).toBe(2);
  expect(ended()).toEqual([
    expect.objectContaining({ stopReason: 'cancelled' }),
    expect.objectContaining({ stopReason: 'cancelled' }),
  ]);
});

it('does not interrupt a completed Turn when its start response arrives afterward', async () => {
  stubScenario({ completionBeforeResponse: true });
  const { directory } = await prepare('edit-and-command');
  const failures: unknown[] = [];
  const session: VendorSession = await codexAdapter.connect(
    {
      sessionId: 'session',
      cwd: directory,
      vendorSessionId: null,
      configOptions: [],
    },
    {
      message: () => {},
      event: () => {},
      failed: (error) => failures.push(error),
    },
    new AbortController().signal,
  );
  cleanups.push(() => session.stop());
  await session.run(prompt);
  await session.run({ type: 'agent.cancel' });
  expect(failures).toEqual([]);
});

it('leaves the Agent ready when Stop cancels a Turn with a pending Elicitation', async () => {
  const { directory } = await prepare('elicitation');
  const events: AgentEvent[] = [];
  const parent = createActor(
    fromCallback<AgentEvent>(({ receive }) =>
      receive((event) => events.push(event)),
    ),
  ).start();
  cleanups.push(() => {
    parent.stop();
  });
  const agent = createActor(agentMachine, {
    input: {
      adapter: codexAdapter,
      sessionId: 'session',
      cwd: directory,
      vendorSessionId: null,
      configOptions: [],
      parent,
    },
  }).start();
  cleanups.push(async () => {
    agent.send({ type: 'agent.stop' });
    await waitFor(agent, (snapshot) => snapshot.status === 'done', cliDeadline);
  });
  await expect
    .poll(
      () => events.some((event) => event.type === 'agent.ready'),
      cliDeadline,
    )
    .toBe(true);
  agent.send(prompt);
  await expect
    .poll(
      () => events.some((event) => event.type === 'agent.elicitationRequested'),
      cliDeadline,
    )
    .toBe(true);
  agent.send({ type: 'agent.cancel' });
  agent.send({ type: 'agent.answerElicitation', action: 'cancel' });
  await expect
    .poll(
      () => events.some((event) => event.type === 'agent.turnEnded'),
      cliDeadline,
    )
    .toBe(true);
  // Wait for both concurrently dispatched commands, including a late interrupt error.
  const cancellationSettleWait = 200;
  await new Promise((resolve) => setTimeout(resolve, cancellationSettleWait));
  expect(events.filter((event) => event.type === 'agent.turnEnded')).toEqual([
    expect.objectContaining({ stopReason: 'cancelled' }),
  ]);
  expect(agent.getSnapshot().status).toBe('active');
  expect(agent.getSnapshot().context.failure).toBeNull();
});

it.each([
  {
    behavior: 'fails an Agent with a live Turn',
    interruptError: 'beforeCompletion' as const,
    status: 'done',
    failure: 'Mock interrupt failed.',
    endedTurns: 0,
  },
  {
    behavior: 'keeps an Agent ready after its Turn ends',
    interruptError: 'afterCompletion' as const,
    status: 'active',
    failure: null,
    endedTurns: 1,
  },
])(
  '$behavior on an interrupt error',
  async ({ interruptError, status, failure, endedTurns }) => {
    stubScenario({ interruptError });
    const { directory } = await prepare('elicitation');
    const events: AgentEvent[] = [];
    const parent = createActor(
      fromCallback<AgentEvent>(({ receive }) =>
        receive((event) => events.push(event)),
      ),
    ).start();
    cleanups.push(() => {
      parent.stop();
    });
    const agent = createActor(agentMachine, {
      input: {
        adapter: codexAdapter,
        sessionId: 'session',
        cwd: directory,
        vendorSessionId: null,
        configOptions: [],
        parent,
      },
    }).start();
    cleanups.push(async () => {
      agent.send({ type: 'agent.stop' });
      await waitFor(
        agent,
        (snapshot) => snapshot.status === 'done',
        cliDeadline,
      );
    });
    await expect
      .poll(
        () => events.some((event) => event.type === 'agent.ready'),
        cliDeadline,
      )
      .toBe(true);
    agent.send(prompt);
    await expect
      .poll(
        () =>
          events.some((event) => event.type === 'agent.elicitationRequested'),
        cliDeadline,
      )
      .toBe(true);
    agent.send({ type: 'agent.cancel' });
    const cancellationSettleWait = 200;
    await new Promise((resolve) => setTimeout(resolve, cancellationSettleWait));
    expect(agent.getSnapshot().status).toBe(status);
    expect(agent.getSnapshot().context.failure).toBe(failure);
    expect(
      events.filter((event) => event.type === 'agent.turnEnded'),
    ).toHaveLength(endedTurns);
  },
);

it.each([
  { description: 'unknown response id', frame: { id: 99999, result: {} } },
  { description: 'missing id and method', frame: {} },
  {
    description: 'null response id',
    frame: { id: null, error: { code: -32700, message: 'Parse error' } },
  },
  {
    description: 'null request id',
    frame: { id: null, method: 'item/tool/requestUserInput', params: {} },
  },
])('fails a connection with a $description frame', async ({ frame }) => {
  const { directory, executable } = await prepare('elicitation');
  writeFileSync(
    executable,
    [
      `#!${process.execPath}`,
      `process.stdout.write(${JSON.stringify(`${JSON.stringify(frame)}\n`)});`,
      'process.stdin.resume();',
      "process.stdin.on('end', () => process.exit(0));",
    ].join('\n'),
  );
  const failures: unknown[] = [];
  const controller = new AbortController();
  cleanups.push(() => controller.abort());
  await expect(
    codexAdapter.connect(
      {
        sessionId: 'session',
        cwd: directory,
        vendorSessionId: null,
        configOptions: [],
      },
      {
        message: () => {},
        event: () => {},
        failed: (error) => failures.push(error),
      },
      controller.signal,
    ),
  ).rejects.toThrow('Unrecognised app-server message');
  expect(failures).toEqual([
    expect.objectContaining({
      message: expect.stringContaining('Unrecognised app-server message'),
    }),
  ]);
});
