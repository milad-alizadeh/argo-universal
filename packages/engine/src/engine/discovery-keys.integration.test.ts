import { mkdtempSync, rmSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  SessionUpdate,
  NewSessionRequest,
} from '@agentclientprotocol/sdk';
import { project } from '@repo/db/schema';
import { createCheckout } from '@repo/git';
import { createAgentMetadata } from '@repo/mocks/agent';
import {
  initTestRepository,
  readSessionCheckouts,
} from '@repo/mocks/git/test-repository';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { seedAgentFixtures } from '#mocks/agent-fixtures';

it('discovery cache keeps different Projects and Agents separate', async () => {
  const commands: SessionUpdate[] = ['one', 'two', 'three'].map((name) => ({
    sessionUpdate: 'available_commands_update',
    availableCommands: [{ name, description: name }],
  }));

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': commands.map((update) => ({
        steps: [{ type: 'update', update }],
      })),
    },
  });

  const directory = mkdtempSync(join(tmpdir(), 'argo-discovery-project-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  await initTestRepository(directory);
  host.database
    .insert(project)
    .values({ id: 'project-2', path: directory, name: 'other' })
    .run();
  seedAgentFixtures(host.database, [createAgentMetadata('other')]);

  const destinations = [
    { projectId: 'project-1', agent: 'mock' },
    { projectId: 'project-2', agent: 'mock' },
    { projectId: 'project-1', agent: 'other' },
  ];

  for (const destination of destinations)
    await host.caller.session.refreshDiscovery(destination);

  const cached = await Promise.all(
    destinations.map((destination) =>
      host.caller.session.discovery(destination),
    ),
  );

  expect(cached.map((result) => result?.commands)).toEqual([
    [{ name: 'one', description: 'one' }],
    [{ name: 'two', description: 'two' }],
    [{ name: 'three', description: 'three' }],
  ]);
});

it('a Project registered through a worktree discovers in its existing main Checkout', async () => {
  const openings: NewSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/new': [{ requests: openings }] },
  });

  const registered = (await host.caller.projects.list())[0];

  if (!registered) throw new Error('Missing Project');

  const linked = await createCheckout({
    projectPath: registered.path,
    projectId: registered.id,
    sessionId: 'registered',
    choice: { type: 'worktree', baseBranch: 'main' },
    runtimeDirectory: host.home,
  });

  host.database
    .update(project)
    .set({ path: linked.path })
    .where(eq(project.id, registered.id))
    .run();
  const before = await readSessionCheckouts(registered.path);

  const reading = host.caller.session.refreshDiscovery({
    projectId: registered.id,
    agent: 'mock',
  });

  await reading;
  expect(await readSessionCheckouts(registered.path)).toEqual(before);
  expect(openings).toEqual([
    { cwd: await realpath(registered.path), mcpServers: [] },
  ]);
});
