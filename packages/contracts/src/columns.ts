import {
  agentServers,
  registryCache,
  blob,
  feedRow,
  pluginState,
  project,
  session,
  shell,
  turn,
} from '@repo/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';

// One Zod schema per table, taken as the columns are (ADR 0013); not exported from the package.
export const projectColumns = createSelectSchema(project);

export const sessionColumns = createSelectSchema(session);

export const turnColumns = createSelectSchema(turn);

export const feedRowColumns = createSelectSchema(feedRow);

export const blobColumns = createSelectSchema(blob);

export const agentServerColumns = createSelectSchema(agentServers);

export const registryCacheColumns = createSelectSchema(registryCache);

export const shellColumns = createSelectSchema(shell);

export const pluginStateColumns = createSelectSchema(pluginState);
