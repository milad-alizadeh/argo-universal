import { isAlive, startLimitMs } from '@repo/process';
import { expect, it } from 'vitest';
import { serverConnectionMachine } from './server-machine';
import { askServer, launchApp } from './server-machine-keep-running.mocks';

it(
  'leaves the Server answering after the desktop app quits, and a relaunch adopts it instead of starting another',
  async (): Promise<void> => {
    const first = await launchApp(serverConnectionMachine);
    await askServer((client) =>
      client.system.setKeepRunning.mutate({ enabled: true }),
    );

    const engine = (await askServer((client) => client.system.info.query()))
      .pid;

    await first.quit();

    expect((await askServer((client) => client.system.info.query())).pid).toBe(
      engine,
    );

    const second = await launchApp(serverConnectionMachine);

    expect(second.serverPid()).toBe(first.serverPid());
    // It never began starting one: a Supervisor that lost the race and exited would also leave `ownedPid` empty.
    expect(second.startedASupervisor()).toBe(false);
    expect(second.ownedPid()).toBeNull();
    expect((await askServer((client) => client.system.info.query())).pid).toBe(
      engine,
    );
  },
  startLimitMs * 2,
);

it(
  'stops the Server it started when the setting is off, as before',
  async (): Promise<void> => {
    const app = await launchApp(serverConnectionMachine);

    await app.quit();

    await expect.poll(() => isAlive(app.serverPid())).toBe(false);
  },
  startLimitMs,
);
