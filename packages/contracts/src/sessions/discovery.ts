import { z } from 'zod';
import { sessionColumns } from '../columns';
import { SessionConfigOption } from './set-config-option';

export const SessionDiscoveryInput = z.strictObject({
  projectId: sessionColumns.shape.projectId,
  agent: sessionColumns.shape.agent,
});

export type SessionDiscoveryInput = z.infer<typeof SessionDiscoveryInput>;

export const SlashCommand = z.strictObject({
  name: z.string(),
  description: z.string(),
  inputHint: z.string().optional(),
});

export const SessionDiscovery = z.strictObject({
  configOptions: z.array(SessionConfigOption),
  commands: z.array(SlashCommand),
});

export type SessionDiscovery = z.infer<typeof SessionDiscovery>;

export const SessionDiscoveryOutput = SessionDiscovery.nullable();
