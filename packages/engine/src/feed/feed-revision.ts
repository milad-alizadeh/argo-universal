// Accepted changes and unreadable startup envelopes share the Session's revision counter.
export const nextFeedRevision = (maxRevision: number): number =>
  maxRevision + 1;
