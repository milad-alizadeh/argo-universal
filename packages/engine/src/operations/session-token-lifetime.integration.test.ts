import { expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { operationCaller, runOperation } from '#mocks/operations';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import {
  sessionAccessHost,
  openAccessSession,
  readAgentIdentity,
  addOtherProject,
} from '#mocks/session-access';

const projectList = { id: 'project.list', params: {} } as const;

it('isolates same-Agent tokens and marks other Projects outside the calling Session scope', async () => {
  const fixture = await sessionAccessHost();
  const otherId = await addOtherProject(fixture.host);
  const first = await openAccessSession(fixture, 'First');
  const second = await openAccessSession(fixture, 'Second');

  expect(first.token).not.toBe(second.token);
  expect([first.home, second.home]).toEqual([
    fixture.host.home,
    fixture.host.home,
  ]);
  expect(fixture.host.agent.processes).toHaveLength(2);

  const foreign = await openAccessSession(fixture, 'Other Project', otherId);

  const expected = expect.arrayContaining([
    expect.objectContaining({ id: 'project-1', inScope: true }),
    expect.objectContaining({ id: otherId, inScope: false }),
  ]);

  expect(await runOperation(first.caller.operations, projectList)).toEqual(
    expected,
  );
  expect(await runOperation(second.caller.operations, projectList)).toEqual(
    expected,
  );
  expect(await runOperation(foreign.caller.operations, projectList)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'project-1', inScope: false }),
      expect.objectContaining({ id: otherId, inScope: true }),
    ]),
  );
  expect(await first.caller.operations.list.query()).toContainEqual(
    expect.objectContaining({
      id: 'session.close',
      enabled: true,
      disabledReason: null,
    }),
  );
  await expect(
    runOperation(first.caller.operations, {
      id: 'session.close',
      params: { sessionId: second.sessionId },
    }),
  ).rejects.toMatchObject({
    message: 'A Permission request requires an active Turn',
    data: { code: 'CONFLICT' },
  });

  const events = await fixture.host.caller.feed.subscribe({
    sessionId: second.sessionId,
    after: null,
  });

  requireScriptedProcessAt(fixture.host.agent.processes, 1).exited.resolve();

  for await (const event of events) if (event.type === 'closed') break;
  await expect(second.caller.operations.list.query()).rejects.toMatchObject({
    data: { code: 'UNAUTHORIZED' },
  });
  expect(await runOperation(first.caller.operations, projectList)).toEqual(
    expected,
  );
}, 30_000);

it('revokes a closed Session token and reopens with a fresh token without stopping its sibling', async () => {
  const fixture = await sessionAccessHost();
  const first = await openAccessSession(fixture, 'First');
  const second = await openAccessSession(fixture, 'Second');
  const session = { sessionId: first.sessionId };

  await fixture.host.caller.session.close(session);
  await expect(first.caller.operations.list.query()).rejects.toMatchObject({
    data: { code: 'UNAUTHORIZED' },
  });
  await expect(
    runOperation(first.caller.operations, projectList),
  ).rejects.toMatchObject({ data: { code: 'UNAUTHORIZED' } });
  expect(
    await runOperation(second.caller.operations, projectList),
  ).toContainEqual(expect.objectContaining({ id: 'project-1', inScope: true }));
  expect(
    requireScriptedProcessAt(fixture.host.agent.processes, 0).terminations,
  ).toBe(1);
  expect(
    requireScriptedProcessAt(fixture.host.agent.processes, 1).terminations,
  ).toBe(0);
  await fixture.host.caller.session.open(session);
  await fixture.host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: 'Again' }],
  });
  await waitForAcpSessionIdle(fixture.host, first.sessionId);
  const reopened = readAgentIdentity(fixture.outputs);

  expect(reopened.token).not.toBe(first.token);
  const caller = await operationCaller(fixture.host, reopened.token);

  expect(await runOperation(caller.operations, projectList)).toContainEqual(
    expect.objectContaining({ id: 'project-1', inScope: true }),
  );
  await expect(first.caller.operations.list.query()).rejects.toMatchObject({
    data: { code: 'UNAUTHORIZED' },
  });
}, 30_000);
