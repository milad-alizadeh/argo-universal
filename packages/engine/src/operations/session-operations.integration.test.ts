import type { CloseSessionRequest } from '@agentclientprotocol/sdk';
import { runningShellStep } from '@repo/mocks/agent/shell-scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { operationCaller, runOperation } from '#mocks/operations';
import { startSessionJourney } from '#mocks/session-journey';

it('renames a Session through its Operation and publishes the title to the App', async () => {
  const host = await startAcpEngine({ steps: [] });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Start work' }],
  });

  const caller = await operationCaller(host);

  await runOperation(caller.operations, {
    id: 'session.rename',
    params: { ...created, title: 'Review the change' },
  });

  expect(
    (await host.caller.session.list({ archived: false })).sessions,
  ).toContainEqual(
    expect.objectContaining({
      ...created,
      title: 'Review the change',
      titleSource: 'user',
    }),
  );
});

it('saves a plan through its Operation in the Session Checkout', async () => {
  const host = await startAcpEngine({ steps: [] });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Start work' }],
  });

  const caller = await operationCaller(host);

  expect(
    await runOperation(caller.operations, {
      id: 'session.savePlan',
      params: { ...created, plan: '# Review the change\n\nInspect the diff.' },
    }),
  ).toEqual({ path: '.argo/plans/review-the-change.md' });
});

it('closes a Session through its Operation and releases its Agent Session', async () => {
  const closed: CloseSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/close': [{ requests: closed }] },
  });

  const created = await host.caller.session.new(emptySessionInput);
  const caller = await operationCaller(host);

  await runOperation(caller.operations, {
    id: 'session.close',
    params: created,
  });

  expect(closed).toEqual([{ sessionId: 'owned-1' }]);
});

it('applies a configuration choice through its Operation and returns the Agent options', async () => {
  const host = await startSessionJourney(['large']);
  const created = await host.caller.session.new(emptySessionInput);
  const caller = await operationCaller(host);

  expect(
    await runOperation(caller.operations, {
      id: 'session.setConfigOption',
      params: { ...created, configId: 'model', type: 'id', value: 'large' },
    }),
  ).toMatchObject({
    configOptions: [
      { configId: 'model', currentValue: 'large', category: 'model' },
    ],
  });
});

it('stops a running Shell through its Operation and updates the Session snapshot', async () => {
  const host = await startAcpEngine({ steps: [runningShellStep] });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Run a command' }],
  });

  const caller = await operationCaller(host);

  const running = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.shells.length === 1,
  );

  const shellId = running.shells[0]?.id ?? '';

  await runOperation(caller.operations, {
    id: 'shell.stop',
    params: { ...created, shellId },
  });

  const stopped = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.shells[0]?.status === 'stopped',
  );

  expect(stopped.shells).toMatchObject([
    { id: shellId, status: 'stopped', canStop: false },
  ]);
});
