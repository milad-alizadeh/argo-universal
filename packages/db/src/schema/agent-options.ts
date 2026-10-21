import { integer, primaryKey, snakeCase, text } from 'drizzle-orm/sqlite-core';
import { agentServers } from '#schema-agent-servers';
import { project } from '#schema-projects';

export const agentOptions = snakeCase.table(
  'agent_options',
  {
    agent: text()
      .notNull()
      .references(() => agentServers.id, { onDelete: 'cascade' }),
    projectId: text()
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    configOptions: text({ mode: 'json' }).notNull(),
    revision: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.agent, table.projectId] })],
);
