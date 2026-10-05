import type { AgentsListOutput } from '@repo/contracts';

export interface AgentsService {
  list(): Promise<AgentsListOutput>;
}
