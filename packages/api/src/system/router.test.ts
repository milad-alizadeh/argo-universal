import type { ClockTick, SystemInfo } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { unreachableServices } from '../../mocks';
import { appRouter } from '../root';
import { createCallerFactory } from '../trpc';

const createCaller = createCallerFactory(appRouter);

const systemInfo: SystemInfo = {
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  pid: 4242,
  name: "Milad's Mac mini",
};

const servicesWith = (ticks: ClockTick[]): import('../services').Services =>
  unreachableServices({
    system: {
      info: (): SystemInfo => systemInfo,
      clock: async function* (): AsyncGenerator<
        ClockTick,
        void,
        Parameters<typeof structuredClone>[0]
      > {
        yield* ticks;
      },
    },
  });

describe('system router', (): void => {
  it('answers system.info from the system service', async (): Promise<void> => {
    const caller = createCaller({ services: servicesWith([]) });

    expect(await caller.system.info()).toEqual(systemInfo);
  });

  it('rejects a system.info that breaks the contract', async (): Promise<void> => {
    const services = servicesWith([]);
    services.system.info = (): Omit<SystemInfo, 'pid'> & { pid: never } => ({
      ...systemInfo,
      pid: 'one' as never,
    });
    const caller = createCaller({ services });

    await expect(caller.system.info()).rejects.toThrow(
      'Output validation failed',
    );
  });

  it('streams system.clock ticks from the system service', async (): Promise<void> => {
    const ticks = [
      { now: '2026-10-03T00:00:00.000Z' },
      { now: '2026-10-03T00:00:01.000Z' },
    ];
    const caller = createCaller({ services: servicesWith(ticks) });

    const received: ClockTick[] = [];
    for await (const tick of await caller.system.clock()) received.push(tick);

    expect(received).toEqual(ticks);
  });

  it('rejects a system.clock tick that breaks the contract', async (): Promise<void> => {
    const caller = createCaller({
      services: servicesWith([{ now: 'not a time' }]),
    });

    const iterate = async (): Promise<void> => {
      for await (const _tick of await caller.system.clock()) {
      }
    };

    await expect(iterate()).rejects.toThrow();
  });
});
