import {
  SessionInfo,
  TerminalExitStatus,
  ToolCallTerminal,
  ToolCallUpdate,
  Turn,
} from '@repo/contracts';
import { z } from 'zod';
import type { PresentOptional } from './agent-optionals';

export const AgentShell = z
  .strictObject({
    id: z.string(),
    toolCallId: ToolCallUpdate.shape.toolCallId,
    command: ToolCallTerminal.shape.command,
    cwd: SessionInfo.shape.cwd,
    status: z.enum(['running', 'exited', 'stopped', 'lost']),
    startedAt: Turn.shape.startedAt,
    endedAt: Turn.shape.endedAt.unwrap().optional(),
    exitCode: TerminalExitStatus.shape.exitCode.nullable(),
  })
  .refine(
    (shell): boolean =>
      shell.endedAt !== undefined || !Object.hasOwn(shell, 'endedAt'),
    'Omit absent optional fields',
  );
export type AgentShell = Omit<
  PresentOptional<z.infer<typeof AgentShell>>,
  'exitCode'
> &
  Pick<z.infer<typeof AgentShell>, 'exitCode'>;
