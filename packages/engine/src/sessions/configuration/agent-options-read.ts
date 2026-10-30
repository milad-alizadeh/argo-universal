import type { SessionAgentOptionsInput } from '@repo/contracts';
import { agentOptions } from '@repo/db/schema';
import { readQueuedJobs, type WriterJob } from '../../storage';
import {
  decode,
  ownerWhere,
  type Sources,
  type Stored,
} from './agent-options-shared';

// The role of a job that changes an Agent's options; a job of any module takes it by having the member.
export interface QueuedAgentOptionsChange {
  // The owner's options as the job's commit leaves them; another owner's stay as they are.
  projectAgentOptions: (
    owner: SessionAgentOptionsInput,
    current: Stored | undefined,
  ) => Stored | undefined;
}

const changesAgentOptions = (
  job: WriterJob,
): job is WriterJob & QueuedAgentOptionsChange => 'projectAgentOptions' in job;

function readStoredConfiguration(
  sources: Sources,
  owner: SessionAgentOptionsInput,
): Stored | undefined {
  const row = sources.database
    .select()
    .from(agentOptions)
    .where(ownerWhere(owner))
    .get();

  return row && decode(row);
}

export function readAgentConfiguration(
  sources: Sources,
  owner: SessionAgentOptionsInput,
): Stored | undefined {
  return readQueuedJobs(sources.writer)
    .filter(changesAgentOptions)
    .reduce<Stored | undefined>(
      (current, job) => job.projectAgentOptions(owner, current),
      readStoredConfiguration(sources, owner),
    );
}
