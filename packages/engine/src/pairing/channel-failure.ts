// What a stream wants when a record will not open or will not seal: whatever was thrown, as an error it can be destroyed with.
export const channelFailure = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));
