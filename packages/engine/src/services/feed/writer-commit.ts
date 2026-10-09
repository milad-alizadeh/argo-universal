export type WriterCommit = Pick<
  PromiseWithResolvers<void>,
  'resolve' | 'reject'
>;
export type PendingWriterCommit = { through: number; committed: WriterCommit };

export const commitWrittenPrefix = (
  pending: PendingWriterCommit[],
  batchSize: number,
): PendingWriterCommit[] => {
  for (const entry of pending)
    if (entry.through <= batchSize) entry.committed.resolve();
  return pending
    .filter((entry) => entry.through > batchSize)
    .map((entry) => ({ ...entry, through: entry.through - batchSize }));
};

export const rejectPendingCommits = (
  pending: PendingWriterCommit[],
  error: unknown,
): PendingWriterCommit[] => {
  for (const entry of pending) entry.committed.reject(error);
  return [];
};
