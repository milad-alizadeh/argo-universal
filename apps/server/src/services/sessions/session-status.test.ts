import { expect, it } from 'vitest';
import { deriveSessionStatus, type SessionStatusInput } from './session-status';

const idle: SessionStatusInput = {
  needsInput: false,
  running: false,
  failure: null,
  latestTurnFailed: false,
  latestTurnInterrupted: false,
  maxRevision: 0,
  seenRevision: 0,
};

it.each([
  [
    'needs_input',
    { needsInput: true, running: true, failure: 'failed', maxRevision: 1 },
  ],
  ['running', { running: true, failure: 'failed', maxRevision: 1 }],
  ['failed', { failure: 'failed', maxRevision: 1 }],
  ['failed', { latestTurnFailed: true, maxRevision: 1 }],
  [
    'unread',
    { latestTurnFailed: true, latestTurnInterrupted: true, maxRevision: 1 },
  ],
  ['unread', { maxRevision: 2, seenRevision: 1 }],
  ['idle', { maxRevision: 2, seenRevision: 2 }],
  ['idle', { latestTurnFailed: true, latestTurnInterrupted: true }],
] as const)('derives %s with %j', (expected, input): void => {
  expect(deriveSessionStatus({ ...idle, ...input })).toBe(expected);
});
