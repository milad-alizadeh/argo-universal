import { expect, it } from 'vitest';
import { sessionConfiguration } from '.';

type Pending = Parameters<typeof sessionConfiguration.hasRoom>[0];

const queued = (count: number): { configId: string; value: string }[] =>
  Array.from({ length: count }, (_, index) => ({
    configId: `option-${index}`,
    value: 'on',
  }));

const queuedChoices = (count: number): Pending['configQueue'] =>
  queued(count).map((choice) => ({
    type: 'session.setConfigOption',
    ...choice,
  }));

it.each([
  { name: 'admits a choice into an empty queue', waiting: 0, held: 0 },
  { name: 'admits the thirty-second pending choice', waiting: 20, held: 11 },
])('$name', ({ waiting, held }): void => {
  expect(
    sessionConfiguration.hasRoom({
      configQueue: queuedChoices(waiting),
      heldConfig: queued(held),
    }),
  ).toBe(true);
});

it('refuses a choice when queued and held choices fill the queue', (): void => {
  expect(
    sessionConfiguration.hasRoom({
      configQueue: queuedChoices(20),
      heldConfig: queued(12),
    }),
  ).toBe(false);
});
