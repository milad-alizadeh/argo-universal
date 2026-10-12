import { expect, it, vi } from 'vitest';
import { createResourceOpening, resourceLaunch } from '#mocks/acp-resource';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
import { createAcpResources } from './index';

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
