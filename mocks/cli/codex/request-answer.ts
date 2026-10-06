import path from 'node:path';
import { z } from 'zod';
import { findRecording, readRecording } from '../recording.ts';
import type { RecordedRequestAnswer } from '../request-answer.ts';

const Request = z.object({
  id: z.union([z.string(), z.number()]),
  method: z.enum([
    'item/commandExecution/requestApproval',
    'item/fileChange/requestApproval',
    'item/tool/requestUserInput',
  ]),
});
const Response = z.object({
  id: z.union([z.string(), z.number()]),
  result: z.unknown(),
});
const TurnStart = z.object({
  method: z.literal('turn/start'),
  params: z.object({
    input: z.array(z.object({ type: z.literal('text'), text: z.string() })),
    collaborationMode: z.object({ mode: z.enum(['plan', 'default']) }),
  }),
});

export function recordedRequestAnswer(name: string): RecordedRequestAnswer {
  const payload = z
    .object({ input: z.array(z.unknown()), messages: z.array(z.unknown()) })
    .parse(
      readRecording(
        findRecording(path.join(import.meta.dirname, 'recordings'), name),
        'codex-app-server',
      ).payload,
    );
  const request = payload.messages
    .map((frame) => Request.safeParse(frame).data)
    .find((frame) => frame !== undefined);
  if (!request) {
    const nextTurn = payload.input
      .map((frame) => TurnStart.safeParse(frame).data)
      .filter((frame) => frame !== undefined)[1];
    if (!nextTurn) throw new Error('Recording has no Plan answer Turn');
    return nextTurn.params.collaborationMode.mode === 'default'
      ? { type: 'plan', continuation: 'startTurn', decision: 'approve' }
      : {
          type: 'plan',
          continuation: 'startTurn',
          decision: 'keep_planning',
          feedback: nextTurn.params.input.map((block) => block.text).join('\n'),
        };
  }
  const response = payload.input
    .map((frame) => Response.safeParse(frame).data)
    .find((frame) => frame?.id === request.id);
  if (!response) throw new Error('Recording has no matching answer');
  if (request.method === 'item/tool/requestUserInput') {
    const result = z
      .object({
        answers: z.record(
          z.string(),
          z.object({ answers: z.array(z.string()) }),
        ),
      })
      .parse(response.result);
    return {
      type: 'elicitation',
      action: 'accept',
      content: Object.fromEntries(
        Object.entries(result.answers).map(([id, answer]) => [
          id,
          answer.answers[0],
        ]),
      ),
    };
  }
  const result = z
    .object({ decision: z.enum(['accept', 'decline', 'cancel']) })
    .parse(response.result);
  return {
    type: 'permission',
    optionId: result.decision === 'accept' ? 'allow_once' : 'reject_once',
  };
}
