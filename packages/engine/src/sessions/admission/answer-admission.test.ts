import type { PendingPermission, PermissionOption } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  admitsElicitationAnswer,
  admitsPermissionAnswer,
  canDeliverFeedback,
  chosenOption,
} from './answer-admission';

const allowOnce: PermissionOption = {
  optionId: 'allow_once',
  name: 'Allow once',
  kind: 'allow_once',
};
const rejectOnce: PermissionOption = {
  optionId: 'reject_once',
  name: 'Deny',
  kind: 'reject_once',
};
const request = (requestId: string): PendingPermission => ({
  requestId,
  toolCallId: `tool-${requestId}`,
  title: 'Read a file',
  options: [allowOnce, rejectOnce],
});
const head = request('first');
const queue = [head, request('second')];
const elicitationQueue = [{ requestId: 'first' }, { requestId: 'second' }];

it.each([
  ['cancels the request', null, null],
  ['names an offered option', 'allow_once', allowOnce],
  ['names an option the Agent did not offer', 'allow_always', undefined],
] as const)('reads an answer that %s', (_name, optionId, expected): void => {
  expect(chosenOption(head, optionId)).toEqual(expected);
});

it.each([
  {
    name: 'admits an offered option for the head request',
    requestId: 'first',
    optionId: 'allow_once',
    admitted: true,
  },
  {
    name: 'admits a cancel for the head request',
    requestId: 'first',
    optionId: null,
    admitted: true,
  },
  {
    name: 'refuses an option the Agent did not offer',
    requestId: 'first',
    optionId: 'allow_always',
    admitted: false,
  },
  {
    name: 'refuses an answer for a queued request',
    requestId: 'second',
    optionId: 'allow_once',
    admitted: false,
  },
  {
    name: 'refuses an answer for an unknown request',
    requestId: 'gone',
    optionId: 'allow_once',
    admitted: false,
  },
])(
  '$name as a Permission answer',
  ({ requestId, optionId, admitted }): void => {
    expect(admitsPermissionAnswer(queue, { requestId, optionId })).toBe(
      admitted,
    );
  },
);

it('admits no Permission answer while nothing is asked', (): void => {
  expect(
    admitsPermissionAnswer([], { requestId: 'first', optionId: null }),
  ).toBe(false);
});

it.each([
  ['admits an answer for the head request', 'first', true],
  ['refuses an answer for a queued request', 'second', false],
  ['refuses an answer for an unknown request', 'gone', false],
] as const)(
  '%s as an Elicitation answer',
  (_name, requestId, expected): void => {
    expect(admitsElicitationAnswer(elicitationQueue, requestId)).toBe(expected);
  },
);

it.each([
  {
    name: 'delivers a rejection to an Agent that reads feedback',
    option: rejectOnce,
    permissionFeedback: true,
    delivered: true,
  },
  {
    name: 'withholds a rejection from an Agent that ignores feedback',
    option: rejectOnce,
    permissionFeedback: false,
    delivered: false,
  },
  {
    name: 'withholds an approval from an Agent that reads feedback',
    option: allowOnce,
    permissionFeedback: true,
    delivered: false,
  },
])('$name as feedback', ({ option, permissionFeedback, delivered }): void => {
  expect(canDeliverFeedback({ permissionFeedback }, option)).toBe(delivered);
});

it('delivers no feedback before the Agent reports its capabilities', (): void => {
  expect(canDeliverFeedback(null, rejectOnce)).toBe(false);
});
