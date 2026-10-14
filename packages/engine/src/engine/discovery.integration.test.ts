import { realpath } from 'node:fs/promises';
import type {
  NewSessionRequest,
  CloseSessionRequest,
} from '@agentclientprotocol/sdk';
import { listBranches } from '@repo/git';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { readSessionCheckouts } from '@repo/mocks/git/test-repository';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const destination = { projectId: 'project-1', agent: 'mock' };

it('Engine discovers configuration and opening Slash commands in the main Checkout and releases the Agent session without creating a Session or branch', async () => {
  const openings: NewSessionRequest[] = [];
  const closes: CloseSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    responses: {
      'session/new': [
        {
          requests: openings,
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'available_commands_update',
                availableCommands: [
                  { name: 'review', description: 'Review changes' },
                ],
              },
            },
          ],
        },
      ],
      'session/close': [{ requests: closes }],
    },
  });

  const project = (await host.caller.projects.list())[0];

  if (!project) throw new Error('Missing Project');
  const before = await listBranches(project.path);
  const checkouts = await readSessionCheckouts(project.path);

  const rows = host.database.$client
    .prepare('SELECT count(*) AS count FROM session')
    .get();

  const discovered = await host.caller.session.refreshDiscovery(destination);

  expect(discovered).toMatchObject({
    configOptions: [
      { configId: 'model', currentValue: 'large' },
      { configId: 'effort' },
      { configId: 'mode' },
      { configId: 'fast' },
    ],
    commands: [{ name: 'review', description: 'Review changes' }],
  });
  expect(openings).toEqual([
    { cwd: await realpath(project.path), mcpServers: [] },
  ]);
  expect(closes).toEqual([{ sessionId: 'owned-1' }]);
  expect(requireScriptedProcessAt(host.agent.processes).terminations).toBe(1);
  expect(
    (await host.caller.session.list({ archived: false })).sessions,
  ).toEqual([]);
  expect(
    host.database.$client
      .prepare('SELECT count(*) AS count FROM session')
      .get(),
  ).toEqual(rows);
  expect(await listBranches(project.path)).toEqual(before);
  expect(await readSessionCheckouts(project.path)).toEqual(checkouts);
});

it('cached discovery reads return promptly during one shared background refresh and collect updates admitted during closure', async () => {
  const opening = Promise.withResolvers<NewSessionRequest>();
  const release = Promise.withResolvers<void>();
  const openings: NewSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    responses: {
      'session/new': [
        { requests: openings },
        { requests: openings, received: opening, waitFor: release.promise },
      ],
      'session/close': [
        { sessionId: 'owned-1' },
        {
          sessionId: 'owned-2',
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'config_option_update',
                configOptions: [
                  {
                    id: 'mode',
                    name: 'Mode',
                    type: 'select',
                    currentValue: 'plan',
                    options: [{ value: 'plan', name: 'Plan' }],
                  },
                ],
              },
            },
            {
              type: 'update',
              update: {
                sessionUpdate: 'available_commands_update',
                availableCommands: [{ name: 'plan', description: 'Plan work' }],
              },
            },
          ],
        },
      ],
    },
  });

  const cached = await host.caller.session.refreshDiscovery(destination);
  expect(await host.caller.session.discovery(destination)).toEqual(cached);
  await opening.promise;
  expect(await host.caller.session.discovery(destination)).toEqual(cached);
  const first = host.caller.session.refreshDiscovery(destination);
  const second = host.caller.session.refreshDiscovery(destination);
  expect(await host.caller.session.discovery(destination)).toEqual(cached);
  release.resolve();
  const results = await Promise.all([first, second]);

  const expected = {
    configOptions: [
      {
        configId: 'mode',
        name: 'Mode',
        type: 'select',
        currentValue: 'plan',
        options: [{ value: 'plan', name: 'Plan' }],
      },
    ],
    commands: [{ name: 'plan', description: 'Plan work' }],
  };

  expect(results).toEqual([expected, expected]);
  expect(openings).toHaveLength(2);
});
