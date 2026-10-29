import { runningShellStep } from '@repo/mocks/agent/shell-scenarios';
import { foregroundSubagent } from '@repo/mocks/agent/subagent-scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { promptedArchiveSession } from '#mocks/archive';
import { operationCaller, runOperation } from '#mocks/operations';
import { startProjectTestHost } from '#mocks/project-host';
import { startSessionJourney } from '#mocks/session-journey';

it('lists a Project’s local branches through an Operation', async () => {
  const host = await startProjectTestHost();
  await host.git('branch', 'topic');
  const caller = await operationCaller(host);

  expect(
    await runOperation(caller.operations, {
      id: 'project.listBranches',
      params: { projectId: 'project-1' },
    }),
  ).toEqual({ branches: ['feature', 'main', 'topic'], currentBranch: 'main' });
});

it('lists comparison branches for a Session through an Operation', async () => {
  const host = await startSessionJourney();
  host.git('branch', 'review');
  const created = await host.caller.session.new(emptySessionInput);
  const caller = await operationCaller(host);

  expect(
    await runOperation(caller.operations, {
      id: 'session.listBranches',
      params: created,
    }),
  ).toEqual({
    branches: [
      { name: 'feature', ref: 'refs/heads/feature' },
      { name: 'main', ref: 'refs/heads/main' },
      { name: 'review', ref: 'refs/heads/review' },
    ],
  });
});

it('lists a Session’s running Shell through an Operation', async () => {
  const host = await startAcpEngine({ steps: [runningShellStep] });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Run a command' }],
  });

  await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) => snapshot.shells.length === 1,
  );
  const caller = await operationCaller(host);

  expect(
    await runOperation(caller.operations, {
      id: 'session.listShells',
      params: created,
    }),
  ).toMatchObject([
    { toolCallId: 'background-command', status: 'running', canStop: true },
  ]);
});

it('lists ACP-reported subagents through an Operation', async () => {
  const host = await startAcpEngine(foregroundSubagent);

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Review the change' }],
  });

  await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) => snapshot.subagents[0]?.state === 'idle',
  );
  const caller = await operationCaller(host);

  expect(
    await runOperation(caller.operations, {
      id: 'session.listAgents',
      params: created,
    }),
  ).toMatchObject([
    {
      parentSessionId: created.sessionId,
      title: 'Review the change',
      state: 'idle',
    },
  ]);
});

it('restores an archived Session through an Operation during the Undo window', async () => {
  const host = await startAcpEngine({ steps: [] });
  const created = await promptedArchiveSession(host, { type: 'main' });
  const caller = await operationCaller(host);
  await host.caller.session.archive({ sessionId: created.sessionId });

  await runOperation(caller.operations, {
    id: 'session.unarchive',
    params: { sessionId: created.sessionId },
  });

  expect(
    (await host.caller.session.list({ archived: false })).sessions,
  ).toContainEqual(expect.objectContaining({ sessionId: created.sessionId }));
});
