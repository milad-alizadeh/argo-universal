import {
  SessionAnswerElicitationInput,
  SessionAnswerPermissionInput,
  SessionAnswerPlanProposalInput,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
import { z } from 'zod';
import recordings from './request-recordings.json';

export const RequestAnswer = z.discriminatedUnion('procedure', [
  z.strictObject({
    procedure: z.literal('answerPermission'),
    input: SessionAnswerPermissionInput,
  }),
  z.strictObject({
    procedure: z.literal('answerElicitation'),
    input: SessionAnswerElicitationInput,
  }),
  z.strictObject({
    procedure: z.literal('answerPlanProposal'),
    input: SessionAnswerPlanProposalInput,
  }),
]);
export type RequestAnswer = z.infer<typeof RequestAnswer>;

const RequestState = z.strictObject({
  rows: z.array(SessionUpdate),
  snapshot: SessionSnapshot,
});
export const RequestMock = z.strictObject({
  agent: z.string(),
  recording: z.string(),
  pending: RequestState,
  answered: RequestState,
  answer: RequestAnswer,
});
export type RequestMock = z.infer<typeof RequestMock>;

export const recordedRequestMocks = z.array(RequestMock).parse(recordings);
