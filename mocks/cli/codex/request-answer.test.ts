import { expect, it } from 'vitest';
import type { VendorRequest } from '../../../packages/agents/codex/messages.ts';
import type { TurnStartParams } from '../../../packages/agents/codex/protocol.gen.ts';
import type { RecordedRequestAnswer } from '../request-answer.ts';
import { toPlanProposalAnswer, toRequestAnswer } from './request-answer.ts';

const commandApproval = 'item/commandExecution/requestApproval';
const fileApproval = 'item/fileChange/requestApproval';
const question = 'item/tool/requestUserInput';

type Example = {
  name: string;
  method: VendorRequest['method'];
  result: unknown;
  answer: RecordedRequestAnswer;
};
const examples: Example[] = [
  {
    name: 'allowed command',
    method: commandApproval,
    result: { decision: 'accept' },
    answer: { type: 'permission', optionId: 'allow_once' },
  },
  {
    name: 'rejected command',
    method: commandApproval,
    result: { decision: 'decline' },
    answer: { type: 'permission', optionId: 'reject_once' },
  },
  {
    name: 'cancelled command',
    method: commandApproval,
    result: { decision: 'cancel' },
    answer: { type: 'permission', optionId: null },
  },
  {
    name: 'allowed file change',
    method: fileApproval,
    result: { decision: 'accept' },
    answer: { type: 'permission', optionId: 'allow_once' },
  },
  {
    name: 'rejected file change',
    method: fileApproval,
    result: { decision: 'decline' },
    answer: { type: 'permission', optionId: 'reject_once' },
  },
  {
    name: 'cancelled file change',
    method: fileApproval,
    result: { decision: 'cancel' },
    answer: { type: 'permission', optionId: null },
  },
  {
    name: 'accepted one answer',
    method: question,
    result: { answers: { color: { answers: ['Blue'] } } },
    answer: {
      type: 'elicitation',
      action: 'accept',
      content: { color: 'Blue' },
    },
  },
  {
    name: 'accepted several answers',
    method: question,
    result: { answers: { colors: { answers: ['Blue', 'Green'] } } },
    answer: {
      type: 'elicitation',
      action: 'accept',
      content: { colors: ['Blue', 'Green'] },
    },
  },
  {
    name: 'declined empty answers',
    method: question,
    result: { answers: {} },
    answer: { type: 'elicitation', action: 'decline' },
  },
  {
    name: 'cancelled held Elicitation',
    method: question,
    result: { method: 'turn/interrupt' },
    answer: { type: 'elicitation', action: 'cancel' },
  },
];

it.each(examples)(
  'reads $name as the adapter sends it',
  ({ method, result, answer }): void => {
    expect(toRequestAnswer({ method }, result)).toEqual(answer);
  },
);

it.each([
  { mode: 'default', answer: { type: 'plan', decision: 'approve' } },
  {
    mode: 'plan',
    answer: {
      type: 'plan',
      decision: 'keep_planning',
      feedback: 'Include verification',
    },
  },
] as const)(
  'reads a Plan proposal answered in $mode mode',
  ({ mode, answer }): void => {
    const start: TurnStartParams = {
      threadId: 'session',
      input: [
        { type: 'text', text: 'Include verification', text_elements: [] },
      ],
      collaborationMode: {
        mode,
        settings: {
          model: 'model',
          reasoning_effort: null,
          developer_instructions: null,
        },
      },
    };
    expect(toPlanProposalAnswer(start)).toEqual(answer);
  },
);

it.each(['acceptForSession', 'unknown'])(
  'rejects the unsupported Permission decision %s',
  (decision): void => {
    expect((): RecordedRequestAnswer =>
      toRequestAnswer({ method: commandApproval }, { decision }),
    ).toThrow('Unsupported codex request answer');
  },
);

it('rejects an unrecognised Plan feedback input kind', (): void => {
  expect((): RecordedRequestAnswer =>
    toPlanProposalAnswer({ input: [{ type: 'unsupported' }] }),
  ).toThrow('Unsupported codex request answer');
});
