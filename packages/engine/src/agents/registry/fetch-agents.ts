// Answers with the registry document's text; the registry reader parses it.
export type FetchAgents = (signal: AbortSignal) => Promise<string>;

export const fetchTimeoutMs = 30_000;

const registryUrl =
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

export async function fetchAgents(signal: AbortSignal): Promise<string> {
  const response = await fetch(registryUrl, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(fetchTimeoutMs)]),
  });

  if (!response.ok) throw new RegistryHttpError(response.status);

  return response.text();
}
