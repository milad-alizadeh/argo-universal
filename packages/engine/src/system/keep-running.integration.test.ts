import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it('does not keep the Server running after the desktop app quits until the owner says so', async (): Promise<void> => {
  const { caller } = await startEngineTestHost();

  expect(await caller.system.keepRunning()).toEqual({ enabled: false });
});

it('keeps the Server running after a quit once the owner turns it on, and off again', async (): Promise<void> => {
  const { caller } = await startEngineTestHost();

  expect(await caller.system.setKeepRunning({ enabled: true })).toEqual({
    enabled: true,
  });
  expect(await caller.system.keepRunning()).toEqual({ enabled: true });

  await caller.system.setKeepRunning({ enabled: false });
  expect(await caller.system.keepRunning()).toEqual({ enabled: false });
});

it('keeps the setting across a restart of the Server', async (): Promise<void> => {
  const first = await startEngineTestHost();
  await first.caller.system.setKeepRunning({ enabled: true });
  await first.stop();

  const { caller } = await startEngineTestHost({ home: first.home });

  expect(await caller.system.keepRunning()).toEqual({ enabled: true });
});
