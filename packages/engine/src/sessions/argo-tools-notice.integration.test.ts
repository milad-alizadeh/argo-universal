import {
  argoToolsNoticeDescription,
  argoToolsNoticeTitle,
} from '@repo/contracts/agents/argo-tools-notice';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

type Scenario = Parameters<typeof startAcpEngine>[0];

// The scripted Agent never starts `argo mcp`, as pi-acp did before Argo started pi through its launcher.
const noGrace: Scenario = { steps: [], argoToolsGraceMs: 0 };

async function toolNotices(host: Host, sessionId: string): Promise<unknown[]> {
  const page = await host.caller.feed.page({ sessionId, direction: 'tail' });

  return page.rows.filter(
    (row) =>
      row.sessionUpdate === 'notice' && row.title === argoToolsNoticeTitle,
  );
}

async function prompt(host: Host, sessionId: string): Promise<void> {
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Again' }],
  });
  await waitForAcpSessionIdle(host, sessionId);
}

async function openPrompted(host: Host): Promise<string> {
  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'First' }],
  });

  await waitForAcpSessionIdle(host, sessionId);

  return sessionId;
}

it("tells the person once that the Agent didn't load Argo's tools, also after the Session reopens", async () => {
  const host = await startAcpEngine(noGrace);
  const sessionId = await openPrompted(host);

  await prompt(host, sessionId);
  await host.caller.session.close({ sessionId });
  await prompt(host, sessionId);

  expect(await toolNotices(host, sessionId)).toMatchObject([
    { severity: 'info', description: argoToolsNoticeDescription(true) },
  ]);
}, 30_000);

// A short first Turn can end before `argo mcp` has started, which is not a dropped server.
it('says nothing while the Agent may still start `argo mcp`', async () => {
  const host = await startAcpEngine({ steps: [] });
  const sessionId = await openPrompted(host);

  expect(await toolNotices(host, sessionId)).toEqual([]);
}, 30_000);

it('tells the person after a first Turn that failed', async () => {
  const host = await startAcpEngine({
    ...noGrace,
    responses: {
      'session/prompt': [{ error: { code: -32_603, message: 'Agent failed' } }],
    },
  });

  const sessionId = await openPrompted(host);

  expect(await toolNotices(host, sessionId)).toHaveLength(1);
}, 30_000);

it('names only Operations when the person turned the checklist off', async () => {
  const host = await startAcpEngine(noGrace);

  await host.caller.agent.setTodoList({ enabled: false });

  const sessionId = await openPrompted(host);

  expect(await toolNotices(host, sessionId)).toMatchObject([
    { description: argoToolsNoticeDescription(false) },
  ]);
}, 30_000);

it('says nothing about Argo tools in a Session without Agent access', async () => {
  const host = await startAcpEngine(noGrace);

  await host.caller.agent.setAccess({ enabled: false });

  const sessionId = await openPrompted(host);

  expect(await toolNotices(host, sessionId)).toEqual([]);
}, 30_000);
