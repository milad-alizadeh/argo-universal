import {
  type PendingElicitation,
  type PendingPermission,
  permissionOptions,
} from '@repo/contracts';
import { expect, it } from 'vitest';
import { pendingInputRequest } from './pending-input';

const permission = (requestId: string): PendingPermission => ({
  requestId,
  toolCallId: `tool-${requestId}`,
  title: 'Run the checks',
  options: permissionOptions,
});

const elicitation = (requestId: string): PendingElicitation => ({
  requestId,
  mode: 'form',
  message: 'Which file?',
  requestedSchema: { properties: {} },
});

it('has no pending Input request when both queues are empty', (): void => {
  expect(
    pendingInputRequest({ permissionQueue: [], elicitationQueue: [] }),
  ).toBeNull();
});

it.each([
  {
    claim: 'the oldest Permission request',
    permissionQueue: [permission('p-1'), permission('p-2')],
    elicitationQueue: [],
    expected: { kind: 'permission', requestId: 'p-1' },
  },
  {
    claim: 'the oldest Elicitation',
    permissionQueue: [],
    elicitationQueue: [elicitation('e-1'), elicitation('e-2')],
    expected: { kind: 'elicitation', requestId: 'e-1' },
  },
  {
    claim: 'a Permission request before an older Elicitation',
    permissionQueue: [permission('p-1')],
    elicitationQueue: [elicitation('e-1')],
    expected: { kind: 'permission', requestId: 'p-1' },
  },
])(
  'answers $claim',
  ({ permissionQueue, elicitationQueue, expected }): void => {
    expect(
      pendingInputRequest({ permissionQueue, elicitationQueue }),
    ).toMatchObject(expected);
  },
);

it('carries the full Permission request for its title', (): void => {
  const request = permission('p-1');

  expect(
    pendingInputRequest({ permissionQueue: [request], elicitationQueue: [] }),
  ).toEqual({ kind: 'permission', requestId: 'p-1', request });
});
