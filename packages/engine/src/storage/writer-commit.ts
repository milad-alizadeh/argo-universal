export type WriterCommit = {
  resolve: () => void;
  reject: (cause: unknown, retrying?: boolean) => void;
  waitForRetry?: true;
};

export type PendingWriterCommit = { through: number; committed: WriterCommit };

export const acknowledgeWrittenPrefix = (
  pendingCommits: PendingWriterCommit[],
  writtenCount: number,
): PendingWriterCommit[] => {
  for (const entry of pendingCommits)
    if (entry.through <= writtenCount) entry.committed.resolve();

  return pendingCommits.flatMap((entry) =>
    entry.through > writtenCount
      ? [{ ...entry, through: entry.through - writtenCount }]
      : [],
  );
};

export const rejectPendingCommits = (
  pendingCommits: PendingWriterCommit[],
  cause: unknown,
  retrying = false,
): PendingWriterCommit[] => {
  for (const entry of pendingCommits)
    if (!retrying || !entry.committed.waitForRetry)
      entry.committed.reject(cause, retrying);

  return retrying
    ? pendingCommits.filter((entry) => entry.committed.waitForRetry)
    : [];
};
