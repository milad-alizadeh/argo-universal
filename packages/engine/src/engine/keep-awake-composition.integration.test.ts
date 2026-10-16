import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import type { Caffeinate } from './caffeinate';

const prompt = [{ type: 'text' as const, text: 'Work until stopped' }];

it('one Engine assertion spans overlapping Turns and releases on the last cancellation while Agent sessions stay open', async () => {
  const release = vi.fn<() => void>();
  const caffeinate = vi.fn<Caffeinate>(() => release);

  const host = await startAcpEngine({
    steps: [{ type: 'wait-for-cancel' }],
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
    steps: [{ type: 'wait-for-cancel' }],
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
