// The main listener and OAuth callback accept the same explicit loopback Host spellings.
export const requestHostAllowed = (
  port: number,
  host: string | undefined,
): boolean => host === `127.0.0.1:${port}` || host === `localhost:${port}`;
