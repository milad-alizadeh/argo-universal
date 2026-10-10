export type WriterCommit = {
  resolve: () => void;
  reject: (error: unknown, retrying?: boolean) => void;
  waitForRetry?: true;
};
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
  retrying = false,
): PendingWriterCommit[] => {
  for (const entry of pendingCommits)
    if (!retrying || !entry.committed.waitForRetry)
      entry.committed.reject(error, retrying);
  return retrying
    ? pendingCommits.filter((entry) => entry.committed.waitForRetry)
    : [];
};
