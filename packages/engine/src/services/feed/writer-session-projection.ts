import { SessionRecord } from '@repo/contracts';
import type { WriterJob } from './writer-job';

type SessionJob = Extract<
  WriterJob,
  { type: 'sessionInsert' | 'sessionRowUpdate' | 'feedRows' }
>;

const targetsSession = (job: SessionJob, sessionId: string): boolean => {
  if (job.type === 'sessionInsert') return job.session.id === sessionId;
  return job.type === 'feedRows'
    ? job.sessionId === sessionId
    : job.id === sessionId;
};

const sessionDefaults = {
  title: '',
  titleSource: 'prompt',
  archivedAt: null,
  seenRevision: 0,
  activityAt: 0,
  failure: null,
  vendorSessionId: null,
  parentSessionId: null,
  checkoutBranch: null,
  vendorRef: null,
  configValues: [],
  epoch: 0,
  maxRevision: 0,
  createdAt: 0,
  updatedAt: 0,
};

const insertedSession = (
  job: Extract<SessionJob, { type: 'sessionInsert' }>,
): SessionRecord => SessionRecord.parse({ ...sessionDefaults, ...job.session });

const writerActivity = (
  current: SessionRecord,
  job: Extract<SessionJob, { type: 'sessionRowUpdate' }>,
): number => job.activityAt ?? current.activityAt;

const revisionActivity = (
  current: SessionRecord,
  job: Extract<SessionJob, { type: 'sessionRowUpdate' }>,
): number => {
  if (job.set.maxRevision === undefined) return current.activityAt;
  return job.set.maxRevision > current.maxRevision
    ? writerActivity(current, job)
    : current.activityAt;
};

const patchedSession = (
  current: SessionRecord,
  job: Extract<SessionJob, { type: 'sessionRowUpdate' }>,
): SessionRecord =>
  SessionRecord.parse({
    ...current,
    ...job.set,
    ...(job.set.maxRevision === undefined
      ? {}
      : { activityAt: revisionActivity(current, job) }),
  });

const advancedSession = (
  current: SessionRecord,
  job: Extract<SessionJob, { type: 'feedRows' }>,
): SessionRecord =>
  job.maxRevision > current.maxRevision
    ? {
        ...current,
        maxRevision: job.maxRevision,
        activityAt: job.activityAt ?? current.activityAt,
      }
    : current;

const applySessionJob = (
  current: SessionRecord | undefined,
  job: SessionJob,
): SessionRecord | undefined => {
  if (job.type === 'sessionInsert') return insertedSession(job);
  if (!current) return undefined;
  return applyExistingSession(current, job);
};

const applyExistingSession = (
  current: SessionRecord,
  job: Exclude<SessionJob, { type: 'sessionInsert' }>,
): SessionRecord =>
  job.type === 'sessionRowUpdate'
    ? patchedSession(current, job)
    : advancedSession(current, job);

const isSessionJob = (job: WriterJob): job is SessionJob =>
  job.type === 'sessionInsert' ||
  job.type === 'sessionRowUpdate' ||
  job.type === 'feedRows';

export const projectSession = (
  row: SessionRecord | undefined,
  sessionId: string,
  jobs: readonly WriterJob[],
): SessionRecord | undefined => {
  let current = row;
  const changes = jobs
    .filter(isSessionJob)
    .filter((job) => targetsSession(job, sessionId));
  for (const job of changes) current = applySessionJob(current, job);
  return current;
};

const includesParent = (
  scope: readonly string[],
  parentSessionId: string | null | undefined,
): boolean => (parentSessionId ? scope.includes(parentSessionId) : false);

const isSessionCandidate = (
  job: Extract<WriterJob, { type: 'sessionInsert' }>,
  scope: readonly string[] | undefined,
): boolean => {
  if (!scope) return true;
  return (
    scope.includes(job.session.id) ||
    includesParent(scope, job.session.parentSessionId)
  );
};

export const pendingSessionIds = (
  jobs: readonly WriterJob[],
  scope?: readonly string[],
): string[] => [
  ...new Set(
    jobs.flatMap((job): string[] =>
      job.type === 'sessionInsert' && isSessionCandidate(job, scope)
        ? [job.session.id]
        : [],
    ),
  ),
];
