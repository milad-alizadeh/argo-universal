import type { AgentInfo } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const listed = async (host: Host): Promise<AgentInfo | undefined> =>
  (await host.caller.agents.list()).find(({ agent }) => agent === 'mock');

const signInNeeded = {
  status: 'sign-in-needed',
  reason: 'The Agent requires sign-in.',
};

it('an Agent that does not report its account is Ready and opens a Session', async () => {
  const host = await startAcpEngine(scenarios['unreported-account']);
  expect(await listed(host)).toMatchObject({ status: 'ready' });
  expect(await host.caller.agents.recheck({ agentId: 'mock' })).toEqual({
    status: 'ready',
  });
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.close(created);
});

it('an Agent that answers session/new with auth_required is saved as Sign-in needed', async () => {
  const host = await startAcpEngine(scenarios['sign-in-on-session']);
  await expect(host.caller.session.new(emptySessionInput)).rejects.toThrow(
    'Authentication required',
  );
  await expect.poll(() => listed(host)).toMatchObject(signInNeeded);
});

it('an Agent that answers a prompt with auth_required is saved as Sign-in needed', async () => {
  const host = await startAcpEngine(scenarios['sign-in-on-prompt']);
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session
    .prompt({ ...created, prompt: [{ type: 'text', text: 'Hello' }] })
    .catch(() => {});
  await expect.poll(() => listed(host)).toMatchObject(signInNeeded);
});
