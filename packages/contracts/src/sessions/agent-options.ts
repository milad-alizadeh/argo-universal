import { z } from 'zod';
import { sessionColumns } from '../columns';
import { SessionConfigOption } from './set-config-option';

// Input of `session.agentOptions`: the Agent and Project a New worktree will start a Session for (ADR-0023).
export const SessionAgentOptionsInput = z.strictObject({
  projectId: sessionColumns.shape.projectId,
  agent: sessionColumns.shape.agent,
});

export type SessionAgentOptionsInput = z.infer<typeof SessionAgentOptionsInput>;

// The Agent's options as a new ACP session in the Project folder reports them.
export const SessionAgentOptionsOutput = z.array(SessionConfigOption);

export type SessionAgentOptionsOutput = z.infer<
  typeof SessionAgentOptionsOutput
>;
