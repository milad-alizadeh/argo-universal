import { expect, it, vi } from 'vitest';
import { createResourceOpening, resourceLaunch } from '#mocks/acp-resource';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
import { createAcpResources } from './index';

const alternativeLaunches = [
  { name: 'command alias', executable: 'agent' },
  { name: 'absolute alias', executable: '/bin/agent' },
  { name: 'symlink alias', executable: '/links/agent' },
  {
    name: 'another installed version',
    executable: '/versions/2/agent',
    version: '2',
  },
];
it.each(alternativeLaunches)(
  'blocks $name from changing credentials used by a live Session',
  async (alternative) => {
    const peer = createScriptedAgentProcess({ steps: [] });
    const resources = createAcpResources(peer);
    const opening = createResourceOpening();
    const lease = await resources.open(opening);
    const launch = { ...opening.launch, ...alternative };
    expect(() => resources.reserveAuthentication(launch)).toThrow('in use');
    expect(peer.processes[0]?.terminations).toBe(0);
    await lease.close();
    resources.reserveAuthentication(launch)();
    await resources.shutdown();
  },
);

it('blocks competing logins and new Sessions across installations sharing credentials', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
  const resources = createAcpResources(peer);
  const release = resources.reserveAuthentication(resourceLaunch);
  const alternative = {
    ...resourceLaunch,
    executable: '/versions/2/agent',
    version: '2',
  };
  expect(() => resources.reserveAuthentication(alternative)).toThrow('in use');
  await expect(
    resources.open({ ...createResourceOpening(), launch: alternative }),
  ).rejects.toThrow('sign-in');
  expect(peer.processes).toHaveLength(0);
  release();
  await resources.shutdown();
});

it('refuses account mutation across Projects until the final Session process has exited', async () => {
  const peer = createScriptedAgentProcess({ steps: [], autoExit: false });
  const resources = createAcpResources(peer);
  const lease = await resources.open(createResourceOpening());
  const otherProject = { ...resourceLaunch, projectId: 'other', cwd: '/other' };
  expect(() => resources.reserveAuthentication(otherProject)).toThrow('in use');
  const closing = lease.close();
  await vi.waitFor(() => expect(peer.processes[0]?.terminations).toBe(1));
  expect(() => resources.reserveAuthentication(otherProject)).toThrow('in use');
  peer.processes[0]?.exited.resolve();
  await closing;
  const release = resources.reserveAuthentication(otherProject);
  release();
  await resources.shutdown();
});

it('blocks competing authentication and Session opening while keeping unrelated auth contexts usable', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
  const resources = createAcpResources(peer);
  const release = resources.reserveAuthentication(resourceLaunch);
  expect(() => resources.reserveAuthentication(resourceLaunch)).toThrow(
    'in use',
  );
  await expect(resources.open(createResourceOpening())).rejects.toThrow(
    'sign-in',
  );
  const opening = createResourceOpening();
  const unrelated = await resources.open({
    ...opening,
    launch: { ...opening.launch, authContext: 'separate-account' },
  });
  await unrelated.close();
  release();
  const current = resources.reserveAuthentication(resourceLaunch);
  release();
  await expect(resources.open(opening)).rejects.toThrow('sign-in');
  current();
  const lease = await resources.open(opening);
  await lease.close();
  await resources.shutdown();
});

it('lets sign-in wait for a closing Session to exit instead of refusing it', async () => {
  const peer = createScriptedAgentProcess({ steps: [], autoExit: false });
  const resources = createAcpResources(peer);
  const lease = await resources.open(createResourceOpening());
  const closing = lease.close();
  await vi.waitFor(() => expect(peer.processes[0]?.terminations).toBe(1));
  let settled = false;
  const waiting = resources
    .settleAuthentication(resourceLaunch)
    .then(() => (settled = true));
  await Promise.resolve();
  expect(settled).toBe(false);
  peer.processes[0]?.exited.resolve();
  await Promise.all([closing, waiting]);
  resources.reserveAuthentication(resourceLaunch)();
  await resources.shutdown();
});

it('does not wait for a live Session, so sign-in still finds the account in use', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
  const resources = createAcpResources(peer);
  const lease = await resources.open(createResourceOpening());
  await resources.settleAuthentication(resourceLaunch);
  expect(() => resources.reserveAuthentication(resourceLaunch)).toThrow(
    'in use',
  );
  await lease.close();
  await resources.shutdown();
});
