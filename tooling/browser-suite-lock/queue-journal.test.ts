import { expect, it } from 'vitest';
import { predecessors } from './queue-journal';

const first = '9717d451-d505-43a2-b6a1-fcea615ee106';

const next = '20719173-df28-4596-9fac-4e2f9651dc7d';

it('keeps a live ticket across unfamiliar or incomplete records', () => {
  const lines = [
    `1 ${first} request`,
    `2 ${first} heartbeat`,
    `3 ${first}`,
    `4 ${next} request`,
  ];

  expect(predecessors(lines.join('\n'), next)).toEqual([first]);
});

it.each(['release', 'gone'])('retires the ticket on %s', (event) => {
  const lines = [
    `1 ${first} request`,
    `2 ${first} ${event}`,
    `3 ${next} request`,
  ];

  expect(predecessors(lines.join('\n'), next)).toEqual([]);
});
