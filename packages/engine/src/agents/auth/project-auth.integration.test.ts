import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentAuthChange } from '@repo/contracts';
import { protocolSessionLogin } from '@repo/mocks/agent/protocol-login';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { agentCredentials } from '#mocks/agent-credentials';
import { seedProject } from '../../projects';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const subject = { agent: 'mock', projectId: 'project-1' };

// One Device's `agents.authChanges` subscription, collected until the test ends.
const watchAuthChanges = async (host: Host): Promise<AgentAuthChange[]> => {
  const watching = new AbortController();
  onTestFinished(() => watching.abort());
  const seen: AgentAuthChange[] = [];

  const changes = await host
    .createCaller({ signal: watching.signal })
    .agents.authChanges(subject);

  void (async (): Promise<void> => {
    for await (const change of changes) seen.push(change);
  })();

  return seen;
};

it('one authenticate tells every watching Device and lets an open waiting in a second Project succeed', async () => {
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
  const devices = [await watchAuthChanges(host), await watchAuthChanges(host)];
  expect(
    await host.caller.agents.authenticate({ ...subject, methodId: 'login' }),
  ).toEqual({ status: 'ok' });
  const methods = [{ type: 'agent', id: 'login', name: 'Sign in' }];
  await expect
    .poll(() => devices)
    .toEqual(
      devices.map(() => [
        { methods, pending: { methodId: 'login' }, outcome: null },
        { methods, pending: null, outcome: { status: 'ok' } },
      ]),
    );
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
  await expect(host.caller.agents.authState(subject)).rejects.toThrow(
    'is not installed',
  );
  expect(host.agent.processes).toHaveLength(1);
  expect(
    await host.caller.agents.authenticate({
      ...subject,
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
