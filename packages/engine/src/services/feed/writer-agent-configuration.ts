import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';

export type AgentConfigurationJob = {
  type: 'agentConfigurationSave';
  agent: Pick<typeof agents.$inferInsert, 'id' | 'configuration' | 'enabled'>;
};

export function saveAgentConfiguration(
  transaction: Pick<Database, 'insert'>,
  job: AgentConfigurationJob,
): void {
  transaction
    .insert(agents)
    .values(job.agent)
    .onConflictDoUpdate({
      target: agents.id,
      set: {
        configuration: job.agent.configuration,
        enabled: job.agent.enabled,
      },
    })
    .run();
}
