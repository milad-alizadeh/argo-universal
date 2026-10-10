export type FetchAgents = (signal: AbortSignal) => Promise<unknown>;

export const registryUrl =
  'https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json';

const serverErrorStatus = 500;
const requestTimeoutStatus = 408;
const rateLimitedStatus = 429;
const retryableClientStatuses = new Set([
  requestTimeoutStatus,
  rateLimitedStatus,
]);

export class RegistryHttpError extends Error {
  readonly retryable: boolean;
  constructor(status: number) {
    super(`Registry returned HTTP ${status}`);
    this.retryable =
      status >= serverErrorStatus || retryableClientStatuses.has(status);
  }
}

export async function fetchAgents(signal: AbortSignal): Promise<unknown> {
  const response = await fetch(registryUrl, { signal });
  if (!response.ok) throw new RegistryHttpError(response.status);
  return response.text();
}
