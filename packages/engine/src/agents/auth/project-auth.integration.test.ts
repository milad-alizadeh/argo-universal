import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { protocolSessionLogin } from '@repo/mocks/agent/protocol-login';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

it('one authenticate lets an open waiting in a second Project succeed', async () => {
  const host = await startAcpEngine(protocolSessionLogin());
  const directory = mkdtempSync(join(tmpdir(), 'argo-auth-project-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  await initTestRepository(directory);
  host.database.$client
    .prepare('INSERT INTO project (id, name, path) VALUES (?, ?, ?)')
    .run('project-2', 'Second', directory);
  const second = { ...emptySessionInput, projectId: 'project-2' };
  await expect(host.caller.session.new(emptySessionInput)).rejects.toThrow(
    'Authentication required',
  );
  await expect(host.caller.session.new(second)).rejects.toThrow(
    'Authentication required',
  );
  expect(
    await host.caller.agents.authenticate({
      agent: 'mock',
      projectId: 'project-1',
      methodId: 'login',
    }),
  ).toEqual({ status: 'ok' });
  await host.createCaller().session.new(second);
  expect(host.agent.processes).toHaveLength(2);
});

it('sessionId picks its live connection after its saved connection entry was dropped', async () => {
  const host = await startAcpEngine({
    ...protocolSessionLogin(),
    authentication: { required: false },
  });

  await host.caller.agents.addRegistry({ id: 'mock' });
  const session = await host.caller.session.new(emptySessionInput);
  await host.caller.agents.remove({ id: 'mock' });
  await host.caller.agents.authState({ agent: 'mock', projectId: 'project-1' });
  expect(host.agent.processes).toHaveLength(2);
  expect(
    await host.caller.agents.authenticate({
      agent: 'mock',
      projectId: 'project-1',
      methodId: 'login',
      sessionId: session.sessionId,
    }),
  ).toEqual({ status: 'ok' });
  const first = host.agent.processes[0];

  if (!first) throw new Error('Session process is missing');
  expect((await first.readRequest()).method).toBe('initialize');
  expect((await first.readRequest()).method).toBe('session/new');
  expect((await first.readRequest()).method).toBe('authenticate');
});
