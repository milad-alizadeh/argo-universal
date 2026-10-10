import { expect, it } from 'vitest';
import {
  createResourcePeer,
  createResourceOpening,
  requireResourceProcessAt,
} from '#mocks/acp-resource';
import { createAcpResources } from '../index';

it('equivalent reordered launches reuse one startup and ignore extra caller fields', async () => {
  let identity = 0;
  const peer = createResourcePeer({
    newSession: () => ({ sessionId: String(++identity) }),
  });
  const resources = createAcpResources(peer);
  const base = createResourceOpening();
  const launch = { ...base.launch, env: { '\u00c5': 'a', 'A\u030a': 'b' } };
  const reordered = {
    authContext: launch.authContext,
    cwd: launch.cwd,
    env: { 'A\u030a': 'b', '\u00c5': 'a' },
    args: launch.args,
    version: launch.version,
    executable: launch.executable,
    agentId: launch.agentId,
    projectId: launch.projectId,
    ignoredCallerField: 'ignored',
  };
  await Promise.all([
    resources.open({ ...base, launch }),
    resources.open({ ...base, launch: reordered }),
  ]);
  expect(peer.processes).toHaveLength(1);
  await resources.shutdown();
});

it('launch arguments and environment are captured before startup awaits', async () => {
  const peer = createResourcePeer();
  const resources = createAcpResources(peer);
  const base = createResourceOpening();
  const args = ['initial'];
  const env = { AUTH: 'initial' };
  const opening = resources.open({
    ...base,
    launch: { ...base.launch, args, env },
  });
  args.push('later');
  env.AUTH = 'later';
  await opening;
  const process = requireResourceProcessAt(peer.processes);
  expect(process.launch.args).toEqual(['initial']);
  expect(process.launch.env).toEqual({ AUTH: 'initial' });
  await resources.shutdown();
});
