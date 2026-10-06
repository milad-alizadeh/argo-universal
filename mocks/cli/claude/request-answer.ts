import path from 'node:path';
import { z } from 'zod';
import { findRecording, readRecording } from '../recording.ts';
import type { RecordedRequestAnswer } from '../request-answer.ts';

const Request = z.object({
  type: z.literal('control_request'),
  request_id: z.string(),
  request: z.object({ tool_name: z.string() }),
});
const Response = z.object({
  type: z.literal('control_response'),
  response: z.object({
    request_id: z.string(),
    response: z.object({
      behavior: z.enum(['allow', 'deny']),
      message: z.string().optional(),
      updatedInput: z
        .object({ answers: z.record(z.string(), z.unknown()).optional() })
        .optional(),
    }),
  }),
});

export function recordedRequestAnswer(name: string): RecordedRequestAnswer {
  const payload = z
    .object({ input: z.array(z.unknown()), output: z.array(z.unknown()) })
    .parse(
      readRecording(
        findRecording(path.join(import.meta.dirname, 'recordings'), name),
        'claude-cli',
      ).payload,
    );
  const request = payload.output
    .map((frame) => Request.safeParse(frame).data)
    .find((frame) => frame !== undefined);
  if (!request) throw new Error('Recording has no request');
  const response = payload.input
    .map((frame) => Response.safeParse(frame).data)
    .find((frame) => frame?.response.request_id === request.request_id)
    ?.response.response;
  if (!response) throw new Error('Recording has no matching answer');
  if (request.request.tool_name === 'ExitPlanMode') {
    if (response.behavior === 'allow')
      return {
        type: 'plan',
        continuation: 'continueTurn',
        decision: 'approve',
      };
    if (response.message === undefined)
      throw new Error('Keep planning has no feedback');
    return {
      type: 'plan',
      continuation: 'continueTurn',
      decision: 'keep_planning',
      feedback: response.message,
    };
  }
  if (request.request.tool_name === 'AskUserQuestion')
    return {
      type: 'elicitation',
      action: response.behavior === 'allow' ? 'accept' : 'decline',
      content: response.updatedInput?.answers,
    };
  return {
    type: 'permission',
    optionId: response.behavior === 'allow' ? 'allow_once' : 'reject_once',
    ...(response.message ? { message: response.message } : {}),
  };
}
