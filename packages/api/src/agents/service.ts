import type { AgentsListInput, AgentsListOutput } from '@repo/contracts';

export interface AgentsService {
  list(input?: AgentsListInput): Promise<AgentsListOutput>;
}
