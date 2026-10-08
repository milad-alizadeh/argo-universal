import { z } from 'zod';

export const AgentCapabilities = z.strictObject({
  permissionFeedback: z.boolean(),
  planApproval: z.enum(['continueTurn', 'startTurn']),
  stopShell: z.boolean(),
});
export type AgentCapabilities = z.infer<typeof AgentCapabilities>;
