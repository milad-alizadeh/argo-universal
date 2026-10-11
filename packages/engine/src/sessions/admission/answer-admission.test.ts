import type { PendingPermission, PermissionOption } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  admitsPermissionAnswer,
  answeredRequest,
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

it.each([
  ['cancels the request', null, null],
  ['names an offered option', 'allow_once', allowOnce],
  ['names an option the Agent did not offer', 'allow_always', undefined],
] as const)('reads an answer that %s', (_name, optionId, expected): void => {
  expect(chosenOption(head, optionId)).toEqual(expected);
});

it.each([
  {
    name: 'answers the head request',
    queued: queue,
    requestId: 'first',
    answered: head,
  },
  {
    name: 'leaves a queued request waiting',
    queued: queue,
    requestId: 'second',
    answered: undefined,
  },
  {
    name: 'answers no unknown request',
    queued: queue,
    requestId: 'gone',
    answered: undefined,
  },
  {
    name: 'answers nothing while nothing is asked',
    queued: [],
    requestId: 'first',
    answered: undefined,
  },
])('$name', ({ queued, requestId, answered }): void => {
  expect(answeredRequest(queued, requestId)).toBe(answered);
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
])(
  '$name as a Permission answer',
  ({ requestId, optionId, admitted }): void => {
    expect(admitsPermissionAnswer(queue, { requestId, optionId })).toBe(
      admitted,
    );
  },
);

it.each([
  {
    name: 'delivers a rejection to an Agent that reads feedback',
    option: rejectOnce,
    capabilities: { permissionFeedback: true },
    delivered: true,
  },
  {
    name: 'withholds a rejection from an Agent that ignores feedback',
    option: rejectOnce,
    capabilities: { permissionFeedback: false },
    delivered: false,
  },
  {
    name: 'withholds an approval from an Agent that reads feedback',
    option: allowOnce,
    capabilities: { permissionFeedback: true },
    delivered: false,
  },
  {
    name: 'withholds a rejection before the Agent reports its capabilities',
    option: rejectOnce,
    capabilities: null,
    delivered: false,
  },
])('$name', ({ option, capabilities, delivered }): void => {
  expect(canDeliverFeedback(capabilities, option)).toBe(delivered);
});
