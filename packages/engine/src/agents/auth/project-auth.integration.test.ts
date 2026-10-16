import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { protocolSessionLogin } from '@repo/mocks/agent/protocol-login';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { agentCredentials } from '#mocks/agent-credentials';
import { seedProject } from '../../projects';

it('one authenticate lets an open waiting in a second Project succeed', async () => {
  const host = await startAcpEngine(protocolSessionLogin(agentCredentials()));
  const directory = mkdtempSync(join(tmpdir(), 'argo-auth-project-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  await initTestRepository(directory);
  await seedProject(host.database, directory);

  const secondProject = (await host.caller.projects.list()).find(
    (project) => project.id !== emptySessionInput.projectId,
  );

  if (!secondProject) throw new Error('The second Project is missing');
  const second = { ...emptySessionInput, projectId: secondProject.id };
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
  const host = await startAcpEngine(
    protocolSessionLogin(agentCredentials({ signedIn: true })),
  );

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
