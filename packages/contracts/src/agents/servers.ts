import { z } from 'zod';
import { agentServerColumns } from '../columns';
import type { ACPAgent } from './upstream/registry.gen';

export const RegistryAgentId = agentServerColumns.pick({ id: true });

export const AgentServerEnvironment = z.record(z.string(), z.string());

export type AgentServerEnvironment = z.infer<typeof AgentServerEnvironment>;

export type AgentServer = z.infer<typeof RegistryAgentId> &
  Pick<ACPAgent, 'name' | 'icon' | 'version'> & { env: AgentServerEnvironment };

export const AgentServerRecord = agentServerColumns;

// The model an Agent predicts Follow-up suggestions with: the Session's own, or one value from the Agent's model list.
export const SuggestionModelChoice = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('session') }),
  z.strictObject({ type: z.literal('model'), value: z.string().min(1) }),
]);

export type SuggestionModelChoice = z.infer<typeof SuggestionModelChoice>;

// One Installed Agent's choice, with the models it last offered; none until it has run a Session.
export const AgentSuggestionModel = RegistryAgentId.extend({
  name: z.string(),
  choice: SuggestionModelChoice,
  models: z.array(z.strictObject({ value: z.string(), name: z.string() })),
});

export type AgentSuggestionModel = z.infer<typeof AgentSuggestionModel>;

export type RegistryAgentId = z.infer<typeof RegistryAgentId>;
