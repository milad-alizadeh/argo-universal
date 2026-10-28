import { expect, it } from 'vitest';
import { sessionReadScope } from '#mocks/session-read-scope';

it('allows discovery and global reads while retaining Plugin secret masking', async () => {
  const { host, calling, user } = await sessionReadScope(true);
  await host.caller.plugin.setSetting({
    pluginId: 'probe',
    key: 'token',
    value: 'fixture-private-read-secret',
  });

  for (const id of [
    'registry.get',
    'agent.list',
    'plugin.list',
    'agent.getAccess',
  ] as const)
    expect(
      await calling.caller.operations.run.mutate({ id, params: {} }),
    ).toEqual(await user.operations.run.mutate({ id, params: {} }));

  const settings = await calling.caller.operations.run.mutate({
    id: 'plugin.getSettings',
    params: { pluginId: 'probe' },
  });

  expect(settings).toMatchObject({
    values: { host: 'github.com' },
    secretsSet: ['token'],
  });
  expect(JSON.stringify(settings)).not.toContain('fixture-private-read-secret');

  const discovered = await calling.caller.operations.list.query();

  for (const id of [
    'session.list',
    'session.get',
    'session.feed',
    'session.changes',
    'session.diff',
    'session.listAgents',
    'session.listShells',
    'session.listBranches',
    'project.listBranches',
    'registry.get',
    'agent.list',
    'agent.getAccess',
    'plugin.list',
    'plugin.getSettings',
  ])
    expect(discovered).toContainEqual(
      expect.objectContaining({ id, enabled: true, disabledReason: null }),
    );
}, 30_000);
