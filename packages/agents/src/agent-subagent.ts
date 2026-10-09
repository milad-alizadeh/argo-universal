import {
  ContentBlock,
  SessionInfo,
  StopReason,
  SubagentState,
  ToolCallUpdate,
  Turn,
  TurnError,
  TurnUsage,
} from '@repo/contracts';
import { z } from 'zod';
import type { PresentOptional } from './agent-optionals';

export const AgentSubagent = z
  .strictObject({
    title: SessionInfo.shape.title.optional(),
    toolCallId: ToolCallUpdate.shape.toolCallId,
    vendorSessionId: z.string(),
    prompt: z.array(ContentBlock),
    role: z.string().optional(),
    state: SubagentState,
    turn: z
      .strictObject({
        vendorTurnId: z.string(),
        model: z.string().optional(),
        startedAt: Turn.shape.startedAt,
        endedAt: Turn.shape.endedAt.unwrap().optional(),
        stopReason: StopReason.optional(),
        usage: TurnUsage.optional(),
        error: TurnError.optional(),
      })
      .refine(
        (turn): boolean =>
          Object.values(turn).every((value): boolean => value !== undefined),
        'Omit absent optional fields',
      )
      .optional(),
  })
  .refine(
    (subagent): boolean =>
      Object.values(subagent).every((value): boolean => value !== undefined),
    'Omit absent optional fields',
  );
export type AgentSubagent = Omit<
  PresentOptional<z.infer<typeof AgentSubagent>>,
  'turn'
> & {
  turn?: PresentOptional<NonNullable<z.infer<typeof AgentSubagent>['turn']>>;
};
