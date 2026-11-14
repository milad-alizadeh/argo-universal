// A temporary provider failure is a load error, not a request to sign in again.
export const accountUnavailable = (): Error =>
  new Error('Account is temporarily unavailable. Try again.');
