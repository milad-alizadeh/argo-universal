export type WriterCommit = Pick<
  PromiseWithResolvers<void>,
  'resolve' | 'reject'
>;
export type PendingWriterCommit = { through: number; committed: WriterCommit };

export const acknowledgeWrittenPrefix = (
  pendingCommits: PendingWriterCommit[],
  writtenCount: number,
): PendingWriterCommit[] => {
  for (const entry of pendingCommits)
    if (entry.through <= writtenCount) entry.committed.resolve();
  return pendingCommits
    .filter((entry) => entry.through > writtenCount)
    .map((entry) => ({ ...entry, through: entry.through - writtenCount }));
};

export const rejectPendingCommits = (
  pendingCommits: PendingWriterCommit[],
  error: unknown,
): PendingWriterCommit[] => {
  for (const entry of pendingCommits) entry.committed.reject(error);
  return [];
};
