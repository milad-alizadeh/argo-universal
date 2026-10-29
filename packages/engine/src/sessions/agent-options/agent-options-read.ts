import type { SessionAgentOptionsInput } from '@repo/contracts';
import { agentOptions } from '@repo/db/schema';
import { readQueuedJobs, type WriterJob } from '../../storage';
import { AgentOptionsJob } from './agent-options-job';
import {
  decode,
  ownerWhere,
  type Sources,
  type Stored,
} from './agent-options-shared';

const isOwnerJob = (
  job: WriterJob,
  owner: SessionAgentOptionsInput,
): job is AgentOptionsJob => job instanceof AgentOptionsJob && job.owns(owner);

const decodeIfPresent = (
  row: typeof agentOptions.$inferSelect | undefined,
): Stored | undefined => row && decode(row);

export function readAgentConfiguration(
  sources: Sources,
  owner: SessionAgentOptionsInput,
): Stored | undefined {
  const row = sources.database
    .select()
    .from(agentOptions)
    .where(ownerWhere(owner))
    .get();

  let current = decodeIfPresent(row);

  for (const job of readQueuedJobs(sources.writer))
    if (isOwnerJob(job, owner)) current = job.project(current);

  return current;
}
