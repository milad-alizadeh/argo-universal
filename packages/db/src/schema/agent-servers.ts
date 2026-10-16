import { snakeCase, text } from 'drizzle-orm/sqlite-core';

export const agentServers = snakeCase.table('agent_servers', {
  id: text().primaryKey(),
  env: text().notNull().default('{}'),
});
