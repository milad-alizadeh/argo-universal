import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  type AgentAdapter,
  type AgentEvent,
  agentAdapters,
  agentMachine,
} from '@repo/agents';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createActor, fromCallback, waitFor } from 'xstate';
import { mockClis } from './index.ts';
import {
  type MockCliScenarioInput,
  mockCliScenarioEnvironment,
} from './mock-cli.ts';

const cleanups: (() => void)[] = [];
const cliDeadline = { timeout: 10_000 };
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

const isAlive = (processId: number) => {
  try {
    process.kill(processId, 0);
    return true;
  } catch {
    return false;
  }
};

async function start(
  adapter: AgentAdapter,
  { scenario = {}, missingExecutable = false } = {} as {
    scenario?: MockCliScenarioInput;
    missingExecutable?: boolean;
  },
) {
  const directory = mkdtempSync(path.join(tmpdir(), 'argo-agent-stop-'));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const mockCli = mockClis[adapter.agent];
  if (!mockCli) throw new Error(`No mock CLI for ${adapter.agent}`);
  if (!missingExecutable)
    await mockCli.write(directory, {
      recording: mockCli.recordings.cancelledTurn,
    });
  vi.stubEnv('PATH', directory);
  const processFile = path.join(directory, 'process-id');
  for (const [key, value] of Object.entries(
    mockCliScenarioEnvironment({ ...scenario, processFile }),
  ))
    vi.stubEnv(key, value);
  const events: AgentEvent[] = [];
  const parent = createActor(
    fromCallback<AgentEvent>(({ receive }) =>
      receive((event) => events.push(event)),
    ),
  ).start();
  cleanups.push(() => parent.stop());
  const agent = createActor(agentMachine, {
    input: {
      adapter,
      sessionId: 'shutdown-test',
      cwd: directory,
      vendorSessionId: null,
      configOptions: [],
      parent,
    },
  }).start();
  cleanups.push(() => {
    agent.stop();
    if (existsSync(processFile)) {
      const processId = Number(readFileSync(processFile, 'utf8'));
      if (isAlive(processId)) process.kill(processId, 'SIGKILL');
    }
  });
  const processId = () => Number(readFileSync(processFile, 'utf8'));
  const stop = async () => {
    agent.send({ type: 'agent.stop' });
    await waitFor(agent, (snapshot) => snapshot.status === 'done', {
      timeout: 10_000,
    });
    expect(agent.getSnapshot().output).toEqual({ failure: null });
    expect(isAlive(processId())).toBe(false);
  };
  return { agent, events, processFile, stop };
}

describe.each(agentAdapters)(
  '$agent shutdown against its mock CLI',
  (adapter) => {
    it.each([false, true])(
      'cancels immediately after a prompt (response blocked: %s)',
      async (blocked) => {
        const { agent, events, stop } = await start(adapter, {
          scenario: { blockTurnStart: blocked },
        });
        await waitFor(
          agent,
          (snapshot) => snapshot.matches({ ready: 'idle' }),
          {
            timeout: 10_000,
          },
        );
        agent.send({
          type: 'agent.prompt',
          turnId: 'turn-1',
          content: [{ type: 'text', text: 'Run a command.' }],
        });
        agent.send({ type: 'agent.cancel' });
        await expect
          .poll(
            () =>
              events.some(
                (event) =>
                  event.type === 'agent.turnEnded' &&
                  event.stopReason === 'cancelled',
              ),
            cliDeadline,
          )
          .toBe(true);
        await stop();
      },
    );

    it('fails within agentStartLimit when the live CLI withholds initialization', async () => {
      const { agent, events, processFile } = await start(adapter, {
        scenario: { blockInitialize: true },
      });
      await expect.poll(() => existsSync(processFile), cliDeadline).toBe(true);
      const processId = Number(readFileSync(processFile, 'utf8'));
      await waitFor(agent, (snapshot) => snapshot.status === 'done', {
        timeout: 11_000,
      });
      expect(agent.getSnapshot().output).toEqual({
        failure:
          'Agent startup exceeded agentStartLimit (10000 ms). Retry the Session.',
      });
      await expect.poll(() => isAlive(processId), cliDeadline).toBe(false);
      expect(events).toEqual([]);
    }, 15_000);

    it('stops while the live CLI is withholding initialization', async () => {
      const { agent, events, processFile, stop } = await start(adapter, {
        scenario: { blockInitialize: true },
      });
      await expect.poll(() => existsSync(processFile), cliDeadline).toBe(true);
      expect(agent.getSnapshot().value).toBe('starting');
      await stop();
      expect(events).toEqual([]);
    });

    it('stops an active Turn, including a blocked prompt response', async () => {
      const { agent, stop } = await start(adapter, {
        scenario: { blockTurnStart: true },
      });
      await waitFor(agent, (snapshot) => snapshot.matches({ ready: 'idle' }), {
        timeout: 10_000,
      });
      agent.send({
        type: 'agent.prompt',
        turnId: 'turn-1',
        content: [{ type: 'text', text: 'Run a command.' }],
      });
      // A CLI that has sent no frame of the Turn yet still has an active Turn.
      await waitFor(agent, (snapshot) => snapshot.matches({ ready: 'turn' }), {
        timeout: 10_000,
      });
      expect(agent.getSnapshot().value).toEqual({ ready: 'turn' });
      await stop();
    });

    it('settles a missing executable without leaving a process', async () => {
      const { agent, processFile } = await start(adapter, {
        missingExecutable: true,
      });
      await waitFor(agent, (snapshot) => snapshot.status === 'done', {
        timeout: 10_000,
      });
      expect(agent.getSnapshot().value).toBe('failed');
      expect(agent.getSnapshot().output?.failure).toEqual(expect.any(String));
      expect(existsSync(processFile)).toBe(false);
    });
  },
);
