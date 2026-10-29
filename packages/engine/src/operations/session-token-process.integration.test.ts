import { expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { operationCaller, runOperation } from '#mocks/operations';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import {
  sessionAccessHost,
  openAccessSession,
  readAgentIdentity,
} from '#mocks/session-access';

const projectList = { id: 'project.list', params: {} } as const;

type Fixture = Awaited<ReturnType<typeof sessionAccessHost>>;

type OpenedSession = Awaited<ReturnType<typeof openAccessSession>>;

type ExitedProcess = { fixture: Fixture; first: OpenedSession };

// The Session's first Agent process exits while the Session stays open.
async function exitFirstProcess(): Promise<ExitedProcess> {
  const fixture = await sessionAccessHost();
  const first = await openAccessSession(fixture, 'First');

  const events = await fixture.host.caller.feed.subscribe({
    sessionId: first.sessionId,
    after: null,
  });

  requireScriptedProcessAt(fixture.host.agent.processes, 0).exited.resolve();

  for await (const event of events) if (event.type === 'closed') break;

  return { fixture, first };
}

// The still-open Session's next Prompt launches its next Agent process.
async function relaunch({ fixture, first }: ExitedProcess): Promise<void> {
  await fixture.host.caller.session.prompt({
    sessionId: first.sessionId,
    prompt: [{ type: 'text', text: 'Again' }],
  });
  await waitForAcpSessionIdle(fixture.host, first.sessionId);
}

it('refuses the token of an exited Agent process, also once the Session relaunches', async () => {
  const exited = await exitFirstProcess();

  await expect(
    exited.first.caller.operations.list.query(),
  ).rejects.toMatchObject({ data: { code: 'UNAUTHORIZED' } });
  await relaunch(exited);
  await expect(
    runOperation(exited.first.caller.operations, projectList),
  ).rejects.toMatchObject({ data: { code: 'UNAUTHORIZED' } });
}, 30_000);

it('gives the next process of the still-open Session a working token', async () => {
  const exited = await exitFirstProcess();
  const { fixture, first } = exited;
  await relaunch(exited);
  expect(fixture.host.agent.processes).toHaveLength(2);
  const relaunched = readAgentIdentity(fixture.outputs);

  expect(relaunched.token).not.toBe(first.token);
  const caller = await operationCaller(fixture.host, relaunched.token);

  expect(await runOperation(caller.operations, projectList)).toContainEqual(
    expect.objectContaining({ id: 'project-1', inScope: true }),
  );
}, 30_000);
