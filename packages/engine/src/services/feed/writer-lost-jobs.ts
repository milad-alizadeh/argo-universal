import type { WriterJob } from './writer-job';

const describedJobLimit = 20;

// Names the first lost jobs and counts the rest, so the log stays bounded however long the queue grew.
export function describeLostJobs(jobs: readonly WriterJob[]): string {
  const named = jobs.slice(0, describedJobLimit).map(describeJob);
  const rest = jobs.length - named.length;
  return [...named, ...(rest > 0 ? [`and ${rest} more`] : [])].join('\n');
}

// One line naming what a job would have written, for the log of lost jobs.
export function describeJob(job: WriterJob): string {
  switch (job.type) {
    case 'blobMetadataUpsert':
      return `upsert Blob metadata ${job.blob.id}`;
    case 'agentCatalogReplace':
      return `replace catalog with ${job.rows.length} accepted Agent rows`;
    case 'syncJobUpdate':
      return `update sync job ${job.source}/${job.scope}`;
    case 'feedRows':
      return `Feed rows ${job.rows.map((row): string => row.id).join(', ')} of Session ${job.sessionId} at maxRevision ${job.maxRevision}`;
    case 'sessionInsert':
      return `insert Session ${job.session.id} of Project ${job.session.projectId}`;
    case 'turnInsert':
      return `insert Turn ${job.turn.id} of Session ${job.turn.sessionId}`;
    case 'turnUpdate':
      return `update Turn ${job.id}: ${Object.keys(job.set).join(', ')}`;
    case 'sessionRowUpdate':
      return `update Session ${job.id}: ${Object.keys(job.set).join(', ')}`;
    default: {
      const unhandled: never = job;
      throw new Error(`Unhandled writer job ${unhandled}`);
    }
  }
}
