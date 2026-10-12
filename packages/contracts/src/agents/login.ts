import { z } from 'zod';
import { AgentId } from './configuration';

const ownerToken = z.string().uuid();
const maximumMethodIdLength = 1024;
export const AgentLoginStart = AgentId.extend({ ownerToken });
export const AgentLoginOperation = z.strictObject({
  operationId: z.string().uuid(),
  ownerToken,
});
export const AgentLoginChoose = AgentLoginOperation.extend({
  methodId: z.string().min(1).max(maximumMethodIdLength),
});
export const AgentLoginAnswer = AgentLoginOperation.extend({
  requestId: z.string(),
  action: z.enum(['accept', 'cancel']),
});
export const AgentLoginSnapshot = z.strictObject({
  operationId: z.string().uuid(),
  agentId: z.string(),
  status: z.enum([
    'starting',
    'choose-method',
    'authenticating',
    'awaiting-browser',
    'checking',
    'closing',
    'ready',
    'cancelled',
    'failed',
    'timed-out',
    'in-use',
    'other-app',
    'unsupported',
    'account-rejected',
    'cleanup-failed',
  ]),
  methods: z.array(z.strictObject({ id: z.string(), name: z.string() })),
  request: z
    .strictObject({ id: z.string(), url: z.string(), message: z.string() })
    .optional(),
  failure: z.string().optional(),
});
export type AgentLoginSnapshot = z.infer<typeof AgentLoginSnapshot>;
export type AgentLoginStart = z.infer<typeof AgentLoginStart>;
export type AgentLoginOperation = z.infer<typeof AgentLoginOperation>;
export type AgentLoginChoose = z.infer<typeof AgentLoginChoose>;
export type AgentLoginAnswer = z.infer<typeof AgentLoginAnswer>;
