import type { SessionRecord } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { agentTitle } from '@repo/mocks/agent/title-scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';

const userTitle = 'Sessions list redesign';

const promptTitle = 'Rename Projects screen to Sessions';

type AcpEngine = Awaited<ReturnType<typeof startAcpEngine>>;

type ListedTitle = Pick<SessionRecord, 'title' | 'titleSource'>;

const startTitledSession = async (
  scenario: keyof typeof scenarios,
): Promise<{
  host: AcpEngine;
  sessionId: string;
}> => {
  const host = await startAcpEngine(scenarios[scenario]);

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: `${promptTitle}\nThen tidy up` }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);

  return { host, sessionId: created.sessionId };
};

const promptAgain = async (
  host: AcpEngine,
  sessionId: string,
): Promise<void> => {
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Carry on' }],
  });
  await waitForAcpSessionIdle(host, sessionId);
};

const listedTitle = async (host: AcpEngine): Promise<ListedTitle[]> =>
  (await host.caller.session.list({ archived: false })).sessions.map(
    ({ title, titleSource }) => ({ title, titleSource }),
  );

it("replaces the prompt title with the Agent's title", async () => {
  const { host, sessionId } = await startTitledSession('agent-title');

  const snapshot = await waitForAcpSnapshot(
    host,
    sessionId,
    (current) => current.titleSource === 'agent',
  );

  expect(snapshot.title).toBe(agentTitle);
  expect(await listedTitle(host)).toEqual([
    { title: agentTitle, titleSource: 'agent' },
  ]);
});

it('keeps the prompt title when the Agent clears or blanks its title', async () => {
  const { host, sessionId } = await startTitledSession('agent-title-cleared');

  await promptAgain(host, sessionId);

  expect(await listedTitle(host)).toEqual([
    { title: promptTitle, titleSource: 'prompt' },
  ]);
});

it('keeps a user rename when the Agent names the Session again', async () => {
  const { host, sessionId } = await startTitledSession('agent-title');

  await host.caller.session.rename({ sessionId, title: `  ${userTitle} ` });
  await promptAgain(host, sessionId);

  const snapshot = await waitForAcpSnapshot(host, sessionId, () => true);

  expect(snapshot).toMatchObject({ title: userTitle, titleSource: 'user' });
  expect(await listedTitle(host)).toEqual([
    { title: userTitle, titleSource: 'user' },
  ]);
});

it.each(['', '   ', agentTitle])(
  'leaves the title alone for a blank or unchanged rename: %j',
  async (title) => {
    const { host, sessionId } = await startTitledSession('agent-title');

    await host.caller.session.rename({ sessionId, title });

    expect(await listedTitle(host)).toEqual([
      { title: agentTitle, titleSource: 'agent' },
    ]);
  },
);

it('renames a stored Session without starting its Agent', async () => {
  const { host, sessionId } = await startTitledSession('agent-title');
  const processes = host.agent.processes.length;

  await host.caller.session.close({ sessionId });
  await host.caller.session.rename({ sessionId, title: userTitle });

  expect(await listedTitle(host)).toEqual([
    { title: userTitle, titleSource: 'user' },
  ]);
  expect(host.agent.processes).toHaveLength(processes);
});

it('refuses to rename an archived Session', async () => {
  const { host, sessionId } = await startTitledSession('agent-title');

  await host.caller.session.archive({ sessionId });

  await expect(
    host.caller.session.rename({ sessionId, title: userTitle }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: 'An archived Session is read-only',
  });
});

it('rejects a rename for an unknown Session', async () => {
  const host = await startAcpEngine({ steps: [] });

  await expect(
    host.caller.session.rename({ sessionId: 'missing', title: userTitle }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
