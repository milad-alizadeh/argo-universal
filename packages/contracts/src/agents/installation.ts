import { z } from 'zod';
import { AgentId } from './configuration';

export const AgentInstallInput = AgentId.extend({ version: z.string().min(1) });

export type AgentInstallInput = z.infer<typeof AgentInstallInput>;

export const AgentInstallCancelInput = AgentId.extend({
  operationId: z.string().uuid(),
});

const operationFields = {
  operationId: z.string().uuid(),
  agentId: z.string(),
  version: z.string(),
};

export const AgentInstallOperation = z.discriminatedUnion('status', [
  z.strictObject({ ...operationFields, status: z.literal('installing') }),
  z.strictObject({ ...operationFields, status: z.literal('installed') }),
  z.strictObject({ ...operationFields, status: z.literal('cancelled') }),
  z.strictObject({
    ...operationFields,
    status: z.literal('failed'),
    failure: z.string(),
  }),
]);

export type AgentInstallOperation = z.infer<typeof AgentInstallOperation>;

export const AgentInstallation = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('not-installed') }),
  z.strictObject({
    status: z.literal('installed'),
    version: z.string(),
    readiness: z.literal('not-checked'),
  }),
  z.strictObject({ status: z.literal('failed'), failure: z.string() }),
]);

export type AgentInstallation = z.infer<typeof AgentInstallation>;

export const AgentInstallStatus = z.strictObject({
  installation: AgentInstallation,
  operation: AgentInstallOperation.nullable(),
});

export type AgentInstallStatus = z.infer<typeof AgentInstallStatus>;
