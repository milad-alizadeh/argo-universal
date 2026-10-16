import { z } from 'zod';
import { AgentLoginTerminalInput, loginTerminalOutputLimit } from './login';

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

export const AgentAuthTerminalRead = AgentAuthSubject.extend({
  cursor: z.number().int().min(0).max(loginTerminalOutputLimit),
});

export const AgentAuthTerminalFrame = z.strictObject({
  cursor: z.number().int().min(0).max(loginTerminalOutputLimit),
  output: z.string().max(loginTerminalOutputLimit),
  closed: z.boolean().optional(),
  exitCode: z.number().int().optional(),
});

export type AgentAuthTerminalFrame = z.infer<typeof AgentAuthTerminalFrame>;

export const AgentAuthTerminalWrite = AgentAuthSubject.extend({
  input: AgentLoginTerminalInput,
});

export type AgentAuthSubject = z.infer<typeof AgentAuthSubject>;

export type AgentAuthenticateInput = z.infer<typeof AgentAuthenticateInput>;
