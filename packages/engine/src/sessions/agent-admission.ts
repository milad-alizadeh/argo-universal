import type { Database } from '@repo/db';
import { hasAgentServer } from '../agents';

export const admitsNewSession = (
  context: { database: Database },
  agent: string,
): boolean => hasAgentServer(context.database, agent);
