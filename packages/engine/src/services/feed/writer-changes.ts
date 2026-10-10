import type { WriterJob } from './writer-job';

export type WriterChange = {
  type: 'writer.changed';
  sessionIds: string[];
  turnIds: string[];
};

type SessionChange = Extract<
  WriterJob,
  { type: 'sessionInsert' | 'sessionRowUpdate' }
>;

const sessionChangeIds = (job: SessionChange): string[] =>
  job.type === 'sessionInsert'
    ? [job.session.id, ...parentId(job.session.parentSessionId)]
    : [job.id, ...parentId(job.set.parentSessionId)];

const conversationChangeIds = (job: WriterJob): string[] => {
  if (job.type === 'feedRows') return [job.sessionId];
  return job.type === 'turnInsert' ? [job.turn.sessionId] : [];
};

const affectedSessions = (job: WriterJob): string[] => {
  if (job.type === 'sessionInsert' || job.type === 'sessionRowUpdate')
    return sessionChangeIds(job);
  return conversationChangeIds(job);
};
const parentId = (id: string | null | undefined): string[] => (id ? [id] : []);

export const describeWriterChanges = (
  jobs: readonly WriterJob[],
): WriterChange => ({
  type: 'writer.changed',
  sessionIds: [...new Set(jobs.flatMap(affectedSessions))],
  turnIds: [
    ...new Set(
      jobs.flatMap((job): string[] =>
        job.type === 'turnUpdate' ? [job.id] : [],
      ),
    ),
  ],
});
