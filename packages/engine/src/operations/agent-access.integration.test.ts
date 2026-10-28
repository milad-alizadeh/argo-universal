import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { operationCaller } from '#mocks/operations';

const readAccess = 'agent.getAccess';

it('defaults Agent access on and keeps an explicit choice after Engine restart', async () => {
  const home = await mkdtemp(join(tmpdir(), 'argo-access-policy-'));
  onTestFinished(() => rm(home, { recursive: true, force: true }));
  const host = await startEngineTestHost({ home });
  const caller = await operationCaller(host);
  expect(
    await caller.operations.run.mutate({ id: readAccess, params: {} }),
  ).toEqual({ enabled: true });
  expect(
    await caller.operations.run.mutate({
      id: 'agent.setAccess',
      params: { enabled: false },
    }),
  ).toEqual({ enabled: false });
  await host.stop();
  const restarted = await startEngineTestHost({ home });
  const afterRestart = await operationCaller(restarted);
  expect(
    await afterRestart.operations.run.mutate({
      id: readAccess,
      params: {},
    }),
  ).toEqual({ enabled: false });
});

it('discovers global Agent settings writes as confirm Operations', async () => {
  const host = await startEngineTestHost();
  const caller = await operationCaller(host);
  const operations = await caller.operations.list.query();
  expect(operations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: readAccess, tier: 'read' }),
      expect.objectContaining({ id: 'agent.setAccess', tier: 'confirm' }),
      expect.objectContaining({
        id: 'agent.installInstructions',
        tier: 'confirm',
      }),
    ]),
  );
});
