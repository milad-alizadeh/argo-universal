import type {
  NewSessionResponse,
  ResumeSessionResponse,
} from '@agentclientprotocol/sdk';
import { expect, it, vi } from 'vitest';
import {
  createResourcePeer,
  resourceOpening,
  resourceDestination,
  resourceUpdate,
  resourceProcessAt,
  resourceInitialization,
} from '#mocks/acp-resource';
import { createAcpResources } from '../index';

it('a withdrawn opening closes its late identity exactly once while its sibling remains live', async () => {
  const pending: ReturnType<
    typeof Promise.withResolvers<NewSessionResponse>
  >[] = [];
  const closed: string[] = [];
  const peer = createResourcePeer({
    newSession: () => {
      const opening = Promise.withResolvers<NewSessionResponse>();
      pending.push(opening);
      return opening.promise;
    },
    closeSession: ({ params }) => {
      closed.push(params.sessionId);
      return {};
    },
  });
  const resources = createAcpResources(peer);
  const abort = new AbortController();
  const first = resources.open({ ...resourceOpening(), signal: abort.signal });
  const firstOutcome = first.catch((error: unknown): unknown => error);
  const updates: ReturnType<typeof resourceUpdate>[] = [];
  const second = resources.open(resourceOpening(resourceDestination(updates)));
  await vi.waitFor(() => expect(pending).toHaveLength(2));
  abort.abort();
  for (const [index, result] of pending.entries())
    result.resolve({ sessionId: index === 0 ? 'withdrawn' : 'survivor' });
  const survivor = await second;
  expect(await firstOutcome).toMatchObject({ name: 'AbortError' });
  const process = resourceProcessAt(peer.processes);
  await process.connection.client.notify(
    'session/update',
    resourceUpdate('survivor'),
  );
  await vi.waitFor(() => expect(updates).toEqual([resourceUpdate('survivor')]));
  expect(closed).toEqual(['withdrawn']);
  expect(process.terminations).toBe(0);
  await survivor.close();
  expect(closed).toEqual(['withdrawn', 'survivor']);
});

it('different Projects and effective launch values never share initialization', async () => {
  const peer = createResourcePeer();
  const resources = createAcpResources(peer);
  const base = resourceOpening();
  await Promise.all([
    resources.open(base),
    resources.open({ ...base, launch: { ...base.launch, projectId: 'other' } }),
    resources.open({
      ...base,
      launch: { ...base.launch, env: { AUTH: 'other' } },
    }),
  ]);
  expect(peer.processes).toHaveLength(3);
  await resources.shutdown();
});

it.each(['session/load', 'session/resume'] as const)(
  'known %s identity routes notifications before opening completes',
  async (method) => {
    const result = Promise.withResolvers<ResumeSessionResponse>();
    const peer = createResourcePeer({
      loadSession: () => result.promise,
      resumeSession: () => result.promise,
    });
    const resources = createAcpResources(peer);
    const updates: ReturnType<typeof resourceUpdate>[] = [];
    const opening = resources.open({
      ...resourceOpening(resourceDestination(updates)),
      opening: {
        method,
        params: { sessionId: 'known', cwd: '/checkout', mcpServers: [] },
      },
    });
    await vi.waitFor(() => expect(peer.processes).toHaveLength(1));
    await peer.processes[0]?.connection.client.notify(
      'session/update',
      resourceUpdate('known'),
    );
    result.resolve({});
    const lease = await opening;
    expect(lease.sessionId).toBe('known');
    expect(updates).toEqual([resourceUpdate('known')]);
    await lease.close();
  },
);

it('withdrawal during shared initialize never dispatches the withdrawn session request', async () => {
  const initialization = Promise.withResolvers<typeof resourceInitialization>();
  let created = 0;
  const peer = createResourcePeer({
    initialize: () => initialization.promise,
    newSession: () => ({ sessionId: String(++created) }),
  });
  const resources = createAcpResources(peer);
  const abort = new AbortController();
  const withdrawn = resources.open({
    ...resourceOpening(),
    signal: abort.signal,
  });
  const outcome = withdrawn.catch((error: unknown): unknown => error);
  const opening = resources.open(resourceOpening());
  abort.abort();
  initialization.resolve(resourceInitialization);
  const sibling = await opening;
  expect(created).toBe(1);
  await sibling.close();
  expect(await outcome).toMatchObject({ name: 'AbortError' });
});
