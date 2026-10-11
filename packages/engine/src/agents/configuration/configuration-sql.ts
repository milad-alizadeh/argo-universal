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
const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};
const parseConfiguredAgent = (row: AgentRow): ConfiguredAgent[] => {
  if (row.configuration === null) return [];
  const parsed = AgentConfiguration.safeParse(parseJson(row.configuration));
  if (parsed.success)
    return [{ id: row.id, enabled: row.enabled, configuration: parsed.data }];
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
  return agent ? selectCustomDefinition(agent) : undefined;
};

export const isAgentDisabled = (database: Database, agentId: string): boolean =>
  readConfiguredAgent(database, agentId)?.enabled === false;
