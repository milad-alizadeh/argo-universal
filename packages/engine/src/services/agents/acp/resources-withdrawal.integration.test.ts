import type {
  NewSessionResponse,
  NewSessionRequest,
  ResumeSessionResponse,
} from '@agentclientprotocol/sdk';
import { expect, it, vi } from 'vitest';
import {
  createResourceOpening,
  createResourceDestination,
  createResourceUpdate,
  resourceInitialization,
} from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { createAcpResources } from '../index';

it('a withdrawn opening closes its late identity exactly once while its sibling remains live', async () => {
  const pending: ReturnType<
    typeof Promise.withResolvers<NewSessionResponse>
  >[] = [
    Promise.withResolvers<NewSessionResponse>(),
    Promise.withResolvers<NewSessionResponse>(),
  ];
  const closed: { sessionId: string }[] = [];
  const requested: NewSessionRequest[] = [];
  const peer = createScriptedAgentProcess({
    steps: [],
    responses: {
      'session/new': pending.map((opening) => ({
        result: opening.promise,
        requests: requested,
      })),
      'session/close': [{ result: {}, requests: closed }],
    },
  });
  const resources = createAcpResources(peer);
  const abort = new AbortController();
  const first = resources.open({
    ...createResourceOpening(),
    signal: abort.signal,
  });
  const firstOutcome = first.catch((error: unknown): unknown => error);
  const updates: ReturnType<typeof createResourceUpdate>[] = [];
  const second = resources.open(
    createResourceOpening(createResourceDestination(updates)),
  );
  await vi.waitFor(() => expect(requested).toHaveLength(2));
  abort.abort();
  for (const [index, result] of pending.entries())
    result.resolve({ sessionId: index === 0 ? 'withdrawn' : 'survivor' });
  const survivor = await second;
  expect(await firstOutcome).toMatchObject({ name: 'AbortError' });
  const process = requireScriptedProcessAt(peer.processes);
  await process.play(
    [{ type: 'update', update: createResourceUpdate('survivor').update }],
    'survivor',
  );
  await vi.waitFor(() =>
    expect(updates).toEqual([createResourceUpdate('survivor')]),
  );
  expect(closed.map(({ sessionId }) => sessionId)).toEqual(['withdrawn']);
  expect(process.terminations).toBe(0);
  await survivor.close();
  expect(closed.map(({ sessionId }) => sessionId)).toEqual([
    'withdrawn',
    'survivor',
  ]);
});

it('different Projects and effective launch values never share initialization', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
  const resources = createAcpResources(peer);
  const base = createResourceOpening();
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
    const peer = createScriptedAgentProcess({
      steps: [],
      responses: { [method]: [{ result: result.promise }] },
    });
    const resources = createAcpResources(peer);
    const updates: ReturnType<typeof createResourceUpdate>[] = [];
    const opening = resources.open({
      ...createResourceOpening(createResourceDestination(updates)),
      opening: {
        method,
        params: { sessionId: 'known', cwd: '/checkout', mcpServers: [] },
      },
    });
    await vi.waitFor(() => expect(peer.processes).toHaveLength(1));
    await peer.processes[0]?.play(
      [{ type: 'update', update: createResourceUpdate('known').update }],
      'known',
    );
    result.resolve({});
    const lease = await opening;
    expect(lease.sessionId).toBe('known');
    expect(updates).toEqual([createResourceUpdate('known')]);
    await lease.close();
  },
);

it('withdrawal during shared initialize never dispatches the withdrawn session request', async () => {
  const initialization = Promise.withResolvers<typeof resourceInitialization>();
  const created: NewSessionRequest[] = [];
  const peer = createScriptedAgentProcess({
    steps: [],
    responses: {
      initialize: [{ result: initialization.promise }],
      'session/new': [{ requests: created }],
    },
  });
  const resources = createAcpResources(peer);
  const abort = new AbortController();
  const withdrawn = resources.open({
    ...createResourceOpening(),
    signal: abort.signal,
  });
  const outcome = withdrawn.catch((error: unknown): unknown => error);
  const opening = resources.open(createResourceOpening());
  abort.abort();
  initialization.resolve(resourceInitialization);
  const sibling = await opening;
  expect(created).toHaveLength(1);
  await sibling.close();
  expect(await outcome).toMatchObject({ name: 'AbortError' });
});
