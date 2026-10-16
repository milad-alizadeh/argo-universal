import { expect, it, onTestFinished, vi } from 'vitest';
import { createResourceOpening, resourceLaunch } from '#mocks/acp-resource';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
import type { AcpResourceInput, DeferredAgentLaunch } from '../../index';
import { createAcpResources } from '../../index';

type HeldLaunch = {
  launch: DeferredAgentLaunch;
  resolving: Promise<AbortSignal>;
  finish: () => void;
  releases: () => number;
};

// A launch whose download runs until `finish`, rejects when its signal aborts, and counts `release` calls.
const heldLaunch = (): HeldLaunch => {
  const resolving = Promise.withResolvers<AbortSignal>();
  const finished = Promise.withResolvers<void>();
  let releases = 0;

  return {
    resolving: resolving.promise,
    finish: finished.resolve,
    releases: () => releases,
    launch: {
      agentId: resourceLaunch.agentId,
      projectId: resourceLaunch.projectId,
      version: resourceLaunch.version,
      resolve: async (signal) => {
        resolving.resolve(signal);
        await new Promise<void>((resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason));
          void finished.promise.then(resolve);
        });

        return { ...resourceLaunch, release: () => (releases += 1) };
      },
    },
  };
};

const openWith = (
  input: AcpResourceInput,
  held: HeldLaunch,
  signal?: AbortSignal,
): {
  resources: ReturnType<typeof createAcpResources>;
  opening: Promise<unknown>;
} => {
  const resources = createAcpResources(input);
  onTestFinished(() => resources.shutdown());

  return {
    resources,
    opening: resources.open({
      ...createResourceOpening(),
      launch: held.launch,
      signal,
    }),
  };
};

const failedLaunch: AcpResourceInput = {
  launchProcess: async () => {
    throw new Error('spawn failed');
  },
};

it.each([
  { outcome: 'starts', input: createScriptedAgentProcess({ steps: [] }) },
  { outcome: 'fails', input: failedLaunch },
])(
  'releases a resolved launch exactly once when its connection $outcome',
  async ({ input }) => {
    const held = heldLaunch();
    const { resources, opening } = openWith(input, held);
    held.finish();
    await opening.catch(() => {});
    await resources.shutdown();

    expect(held.releases()).toBe(1);
  },
);

it('shutdown aborts a launch that is still resolving', async () => {
  const held = heldLaunch();
  const { resources, opening } = openWith(
    createScriptedAgentProcess({ steps: [] }),
    held,
  );

  const signal = await held.resolving;
  await resources.shutdown();
  expect(signal.aborted).toBe(true);
  await expect(opening).rejects.toThrow();
  expect(held.releases()).toBe(0);
});

it('keeps resolving while one of two waiting Sessions withdraws', async () => {
  const held = heldLaunch();
  const withdrawn = new AbortController();
  const peer = createScriptedAgentProcess({ steps: [] });
  const { resources, opening } = openWith(peer, held, withdrawn.signal);

  const waiting = resources.open({
    ...createResourceOpening(),
    launch: held.launch,
  });

  const signal = await held.resolving;
  withdrawn.abort(new Error('Session closed'));
  await expect(opening).rejects.toThrow('Session closed');
  expect(signal.aborted).toBe(false);
  held.finish();
  await expect(waiting).resolves.toMatchObject({ sessionId: 'owned-1' });
  await vi.waitFor(() => expect(held.releases()).toBe(1));
});
