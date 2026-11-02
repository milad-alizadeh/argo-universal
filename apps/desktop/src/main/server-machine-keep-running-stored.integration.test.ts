import { isAlive, startLimitMs } from '@repo/process';
import { expect, it } from 'vitest';
import {
  askServer,
  launchApp,
  slowEngine,
} from './server-machine-keep-running.mocks';

it(
  'leaves the Server answering when the app quits against an Engine too slow to answer and the stored setting is on',
  async (): Promise<void> => {
    const slow = await launchApp(slowEngine);
    await askServer((client) =>
      client.system.setKeepRunning.mutate({ enabled: true }),
    );

    const engine = (await askServer((client) => client.system.info.query()))
      .pid;

    // This launch started the Supervisor, so only the stored setting stands between it and a stop.
    expect(slow.ownedPid()).toBe(slow.serverPid());

    await slow.quit();

    expect((await askServer((client) => client.system.info.query())).pid).toBe(
      engine,
    );
  },
  startLimitMs * 2,
);

it(
  'stops the Server it started when the app quits against an Engine too slow to answer and the stored setting is off',
  async (): Promise<void> => {
    const app = await launchApp(slowEngine);

    await app.quit();

    await expect.poll(() => isAlive(app.serverPid())).toBe(false);
  },
  startLimitMs,
);
