import { expect, it } from 'vitest';
import type {
  PermissionResult,
  SDKControlRequest,
} from '../../../packages/agents/claude/messages.ts';
import type { RecordedRequestAnswer } from '../request-answer.ts';
import { readPermissionResult, toRequestAnswer } from './request-answer.ts';

const cancelledMessage = 'Request cancelled';

type Example = {
  name: string;
  tool: string;
  response: PermissionResult;
  answer: RecordedRequestAnswer;
};
const examples: Example[] = [
  {
    name: 'allowed Permission',
    tool: 'Bash',
    response: { behavior: 'allow' },
    answer: { type: 'permission', optionId: 'allow_once' },
  },
  {
    name: 'rejected Permission',
    tool: 'Bash',
    response: { behavior: 'deny', message: 'Stay inside the Checkout' },
    answer: {
      type: 'permission',
      optionId: 'reject_once',
      message: 'Stay inside the Checkout',
    },
  },
  {
    name: 'cancelled Permission',
    tool: 'Bash',
    response: { behavior: 'deny', message: cancelledMessage },
    answer: {
      type: 'permission',
      optionId: 'reject_once',
      message: cancelledMessage,
    },
  },
  {
    name: 'accepted Elicitation',
    tool: 'AskUserQuestion',
    response: {
      behavior: 'allow',
      updatedInput: { answers: { Color: 'Blue' } },
    },
    answer: {
      type: 'elicitation',
      action: 'accept',
      content: { Color: 'Blue' },
    },
  },
  {
    name: 'declined Elicitation',
    tool: 'AskUserQuestion',
    response: { behavior: 'deny', message: 'User declined to answer' },
    answer: { type: 'elicitation', action: 'decline' },
  },
  {
    name: 'cancelled Elicitation',
    tool: 'AskUserQuestion',
    response: {
      behavior: 'deny',
      message: cancelledMessage,
      interrupt: true,
    },
    answer: { type: 'elicitation', action: 'cancel' },
  },
  {
    name: 'approved Plan proposal',
    tool: 'ExitPlanMode',
    response: { behavior: 'allow' },
    answer: { type: 'plan', decision: 'approve' },
  },
  {
    name: 'kept Plan proposal',
    tool: 'ExitPlanMode',
    response: { behavior: 'deny', message: 'Include verification' },
    answer: {
      type: 'plan',
      decision: 'keep_planning',
      feedback: 'Include verification',
    },
  },
];

it.each(examples)(
  'reads $name as the adapter sends it',
  ({ tool, response, answer }): void => {
    const request: Extract<
      SDKControlRequest['request'],
      { subtype: 'can_use_tool' }
    > = {
      subtype: 'can_use_tool',
      tool_name: tool,
      tool_use_id: 'request',
      input: {},
    };
    expect(toRequestAnswer(request, readPermissionResult(response))).toEqual(
      answer,
    );
  },
);

it.each([
  {},
  { behavior: 'deny' },
  { behavior: 'deny', message: 'No', interrupt: 'yes' },
  { behavior: 'allow', updatedInput: [] },
])('rejects an unrecognised response %j', (response): void => {
  expect((): PermissionResult => readPermissionResult(response)).toThrow(
    'Unsupported claude request answer',
  );
});
