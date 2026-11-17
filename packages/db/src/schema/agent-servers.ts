import { snakeCase, text } from 'drizzle-orm/sqlite-core';

export const agentServers = snakeCase.table('agent_servers', {
  id: text().primaryKey(),
  env: text().notNull().default('{}'),
  // The user's choice of model for Follow-up suggestions, as JSON; none keeps the Agent's vendor default.
  suggestionModel: text(),
});
