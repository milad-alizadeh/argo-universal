import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import type { AgentCommandOf } from '@repo/agents';
import { z } from 'zod';
import { readMockCliEnvironment } from './mock-cli.ts';

const RequestAnswer = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('permission'),
    optionId: z.enum(['allow_once', 'reject_once']),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal('elicitation'),
    action: z.enum(['accept', 'decline', 'cancel']),
    content: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.literal('plan'),
    decision: z.enum(['approve', 'keep_planning']),
    feedback: z.string().optional(),
  }),
]);

export function recordRequestAnswer(answer: RecordedRequestAnswer) {
  const file = readMockCliEnvironment().scenario.requestAnswersFile;
  if (file) appendFileSync(file, `${JSON.stringify(answer)}\n`);
}

export function readRequestAnswers(file: string) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => RequestAnswer.parse(JSON.parse(line)));
}

export type RecordedRequestAnswer =
  | {
      type: 'permission';
      optionId: Exclude<
        AgentCommandOf<'agent.answerPermission'>['optionId'],
        null
      >;
      message?: string;
    }
  | ({ type: 'elicitation' } & Pick<
      AgentCommandOf<'agent.answerElicitation'>,
      'action' | 'content'
    >)
  | ({ type: 'plan' } & (
      | { decision: 'approve'; feedback?: string }
      | { decision: 'keep_planning'; feedback: string }
    ));
