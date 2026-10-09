import type { FixtureOutput, FixtureTick } from '../../mocks/trpc-mock-link';
import type { Fixtures } from '../../mocks/trpc-mock-link';

const firstTick = Date.parse('2026-10-03T10:00:00.000Z');

const sleep = (milliseconds: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

// Default fixture for each procedure that ConnectionScreen calls; a story overrides one at most.
export const connectionScreenMocks = {
  'system.info': (): FixtureOutput<'system.info'> => ({
    version: '1.2.3',
    startedAt: '2026-10-03T09:00:00.000Z',
    pid: 4242,
    name: "Milad's Mac mini",
  }),
  'system.clock': async function* (
    _input,
    signal,
  ): AsyncGenerator<FixtureTick<'system.clock'>, void> {
    for (let second = 0; !signal.aborted; second++) {
      yield { now: new Date(firstTick + second * 1000).toISOString() };
      await sleep(1000);
    }
  },
} satisfies Fixtures;
