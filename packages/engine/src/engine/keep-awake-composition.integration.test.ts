import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import type { Caffeinate } from './caffeinate';

const waitForCancelStep = 'wait-for-cancel';

const prompt = [{ type: 'text' as const, text: 'Work until stopped' }];

it.each(['completed', 'cancelled'] as const)(
  'keeps awake for background Subagent Turns after the parent Turn is %s',
  async (ending) => {
    const release = vi.fn<() => void>();
    const caffeinate = vi.fn<Caffeinate>(() => release);
    const steps = scenarios['subagent-background'].steps;

    const host = await startAcpEngine({
      steps:
        ending === 'completed'
          ? steps
          : [...steps, { type: waitForCancelStep }],
      caffeinate,
    });

    const created = await host.caller.session.new({
      ...emptySessionInput,
      prompt,
    });

    await waitForAcpSnapshot(
      host,
      created.sessionId,
      (snapshot) => snapshot.subagents.length === 1,
    );

    if (ending === 'cancelled') await host.caller.session.cancel(created);
    await waitForAcpSessionIdle(host, created.sessionId);
    expect(await host.caller.session.subagents(created)).toEqual([
      expect.objectContaining({ state: 'running' }),
    ]);
    expect(caffeinate).toHaveBeenCalledExactlyOnceWith(process.pid);
    expect(release).not.toHaveBeenCalled();

    const agent = requireScriptedProcessAt(host.agent.processes);
    await agent.play(
      [
        {
          type: 'update',
          update: {
            sessionUpdate: 'subagent_update',
            sessionId: 'subagent-review',
            state: { state: 'idle' },
          },
        },
      ],
      'owned-1',
    );
    await vi.waitFor(() => expect(release).toHaveBeenCalledOnce());
    await agent.play(
      [
        {
          type: 'update',
          update: {
            sessionUpdate: 'subagent_update',
            sessionId: 'subagent-review',
            state: { state: 'running' },
          },
        },
      ],
      'owned-1',
    );
    await vi.waitFor(() => expect(caffeinate).toHaveBeenCalledTimes(2));
    await host.stop();
    expect(release).toHaveBeenCalledTimes(2);
  },
);

it('one Engine assertion spans overlapping Turns and releases on the last cancellation while Agent sessions stay open', async () => {
  const release = vi.fn<() => void>();
  const caffeinate = vi.fn<Caffeinate>(() => release);

  const host = await startAcpEngine({
    steps: [{ type: waitForCancelStep }],
    caffeinate,
  });

  const first = await host.caller.session.new(emptySessionInput);
  const second = await host.caller.session.new(emptySessionInput);
  expect(caffeinate).not.toHaveBeenCalled();

  await host.caller.session.prompt({ ...first, prompt });
  await host.caller.session.prompt({ ...second, prompt });
  expect(caffeinate).toHaveBeenCalledExactlyOnceWith(process.pid);
  await host.caller.session.cancel(first);
  expect(release).not.toHaveBeenCalled();
  await host.caller.session.cancel(second);
  await vi.waitFor(() => expect(release).toHaveBeenCalledOnce());
  expect(requireScriptedProcessAt(host.agent.processes).terminations).toBe(0);

  await host.caller.session.prompt({ ...first, prompt });
  expect(caffeinate).toHaveBeenCalledTimes(2);
  await host.stop();
  expect(release).toHaveBeenCalledTimes(2);
});

it.each([
  { name: 'normal completion', steps: [] },
  {
    name: 'prompt failure',
    steps: [{ type: 'fail' as const, message: 'Failed' }],
  },
  {
    name: 'Agent process exit',
    steps: [{ type: 'exit' as const, code: 1, stderr: 'Agent exited' }],
  },
])('releases keep awake after $name', async ({ steps }) => {
  const release = vi.fn<() => void>();
  const caffeinate = vi.fn<Caffeinate>(() => release);
  const host = await startAcpEngine({ steps, caffeinate });
  await host.caller.session.new({ ...emptySessionInput, prompt });
  await vi.waitFor(() => expect(release).toHaveBeenCalledOnce());
  expect(caffeinate).toHaveBeenCalledExactlyOnceWith(process.pid);
});

it('stopping the Engine actor releases an owned assertion even before graceful Session shutdown', async () => {
  const release = vi.fn<() => void>();

  const host = await startAcpEngine({
    steps: [{ type: waitForCancelStep }],
    caffeinate: () => release,
  });

  await host.caller.session.new({ ...emptySessionInput, prompt });
  host.engine.stop();
  expect(release).toHaveBeenCalledOnce();
  // Abrupt actor stop skips Engine shutdown; finish real resources for this test.
  await host.engine.getSnapshot().context.server?.close();
  await host.engine.getSnapshot().context.server?.closeSetup();
  await host.engine.getSnapshot().context.acpResources.shutdown();
  await host.engine.getSnapshot().context.installations.shutdown();
  host.database.$client.close();
});
