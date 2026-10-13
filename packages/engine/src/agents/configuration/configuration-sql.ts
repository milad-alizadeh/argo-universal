import {
  AgentConfiguration,
  type ConfiguredAgent,
  type CustomAgentDefinition,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { createRejectionCounter } from '@repo/machine-log';
import { eq, isNotNull, type SQL } from 'drizzle-orm';

const rejections = createRejectionCounter('Agent configurations');

type AgentRow = Pick<
  typeof agents.$inferSelect,
  'id' | 'enabled' | 'configuration'
>;

const parseConfiguration = (text: string): AgentConfiguration | undefined => {
  try {
    const parsed = AgentConfiguration.safeParse(JSON.parse(text));

    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};

const parseConfiguredAgent = (row: AgentRow): ConfiguredAgent[] => {
  if (row.configuration === null) return [];
  const configuration = parseConfiguration(row.configuration);

  if (configuration)
    return [{ id: row.id, enabled: row.enabled, configuration }];
  rejections.report(`Stored configuration of Agent ${row.id} is malformed`);

  return [];
};

const readAgentRows = (database: Database, where: SQL): AgentRow[] =>
  database
    .select({
      id: agents.id,
      enabled: agents.enabled,
      configuration: agents.configuration,
    })
    .from(agents)
    .where(where)
    .all();

export const readConfiguredAgents = (database: Database): ConfiguredAgent[] =>
  readAgentRows(database, isNotNull(agents.configuration)).flatMap(
    parseConfiguredAgent,
  );

export const readConfiguredAgent = (
  database: Database,
  agentId: string,
): ConfiguredAgent | undefined => {
  const [row] = readAgentRows(database, eq(agents.id, agentId));

  return row ? parseConfiguredAgent(row)[0] : undefined;
};

export const selectCustomDefinition = ({
  configuration,
}: ConfiguredAgent): CustomAgentDefinition | undefined =>
  configuration.source === 'custom' ? configuration.definition : undefined;

// Ignores enablement, so a Session admitted before a disable keeps its launch.
export const readCustomDefinition = (
  database: Database,
  agentId: string,
): CustomAgentDefinition | undefined => {
  const agent = readConfiguredAgent(database, agentId);

  return agent && !agent.configuration.removed
    ? selectCustomDefinition(agent)
    : undefined;
};

export const isAgentDisabled = (database: Database, agentId: string): boolean =>
  readConfiguredAgent(database, agentId)?.enabled === false;
