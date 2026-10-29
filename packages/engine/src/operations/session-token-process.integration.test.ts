import { expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { operationCaller } from '#mocks/operations';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import {
  sessionAccessHost,
  openAccessSession,
  readAgentIdentity,
} from '#mocks/session-access';

const projectList = { id: 'project.list', params: {} } as const;

it('refuses the token of an exited Agent process and gives the next process of the still-open Session a working one', async () => {
  const fixture = await sessionAccessHost();
  const first = await openAccessSession(fixture, 'First');
  const session = { sessionId: first.sessionId };

  const events = await fixture.host.caller.feed.subscribe({
    ...session,
    after: null,
  });

  requireScriptedProcessAt(fixture.host.agent.processes, 0).exited.resolve();

  for await (const event of events) if (event.type === 'closed') break;
  await expect(first.caller.operations.list.query()).rejects.toMatchObject({
    data: { code: 'UNAUTHORIZED' },
  });
  await fixture.host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: 'Again' }],
  });
  await waitForAcpSessionIdle(fixture.host, first.sessionId);
  expect(fixture.host.agent.processes).toHaveLength(2);
  const relaunched = readAgentIdentity(fixture.outputs);

  expect(relaunched.token).not.toBe(first.token);
  const caller = await operationCaller(fixture.host, relaunched.token);

  expect(await caller.operations.run.mutate(projectList)).toContainEqual(
    expect.objectContaining({ id: 'project-1', inScope: true }),
  );
  await expect(
    first.caller.operations.run.mutate(projectList),
  ).rejects.toMatchObject({ data: { code: 'UNAUTHORIZED' } });
}, 30_000);
