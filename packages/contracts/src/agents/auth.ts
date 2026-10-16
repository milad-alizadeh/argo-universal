import { z } from 'zod';

export const authTerminalOutputLimit = 262_144;

export const authTerminalInputLimit = 4096;

const terminalColsLimit = 500;

const terminalRowsLimit = 200;

export const AgentAuthTerminalInput = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('write'),
    text: z.string().min(1).max(authTerminalInputLimit),
  }),
  z.strictObject({
    type: z.literal('resize'),
    cols: z.number().int().min(2).max(terminalColsLimit),
    rows: z.number().int().min(2).max(terminalRowsLimit),
  }),
]);

export type AgentAuthTerminalInput = z.infer<typeof AgentAuthTerminalInput>;

export const AgentAuthSubject = z.strictObject({
  agent: z.string().min(1),
  projectId: z.string().min(1),
});

export const AgentAuthenticateInput = AgentAuthSubject.extend({
  methodId: z.string(),
  sessionId: z.string().optional(),
});

export const AgentAuthState = z.strictObject({
  methods: z.array(
    z.strictObject({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      type: z.enum(['agent', 'terminal']),
    }),
  ),
  description: z.string().optional(),
  pending: z.strictObject({ methodId: z.string() }).nullable(),
});

export type AgentAuthState = z.infer<typeof AgentAuthState>;

export const AgentAuthenticateOutput = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('ok') }),
  z.strictObject({ status: z.literal('failed'), message: z.string() }),
]);

export type AgentAuthenticateOutput = z.infer<typeof AgentAuthenticateOutput>;

// One `agents.authChanges` value: the shared sign-in state and the last attempt's outcome, if any.
export const AgentAuthChange = AgentAuthState.extend({
  outcome: AgentAuthenticateOutput.nullable(),
});

export type AgentAuthChange = z.infer<typeof AgentAuthChange>;

export const AgentAuthTerminalRead = AgentAuthSubject.extend({
  cursor: z.number().int().min(0).max(authTerminalOutputLimit),
});

export const AgentAuthTerminalFrame = z.strictObject({
  cursor: z.number().int().min(0).max(authTerminalOutputLimit),
  output: z.string().max(authTerminalOutputLimit),
  closed: z.boolean().optional(),
  exitCode: z.number().int().optional(),
});

export type AgentAuthTerminalFrame = z.infer<typeof AgentAuthTerminalFrame>;

export const AgentAuthTerminalWrite = AgentAuthSubject.extend({
  input: AgentAuthTerminalInput,
});

export type AgentAuthSubject = z.infer<typeof AgentAuthSubject>;

export type AgentAuthenticateInput = z.infer<typeof AgentAuthenticateInput>;
