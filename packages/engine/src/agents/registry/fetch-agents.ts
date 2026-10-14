import { fetchNpmPackage, type NpmRelease } from './npm-package';

// The Registry port answers with a document's text, which its reader parses: the ACP Registry's Agent list, or, given an npx entry's package release, npm's metadata for it.
export type FetchAgents = (
  signal: AbortSignal,
  npmRelease?: NpmRelease,
) => Promise<string>;

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

export async function fetchAgents(
  signal: AbortSignal,
  npmRelease?: NpmRelease,
): Promise<string> {
  if (npmRelease) return fetchNpmPackage(npmRelease, signal);

  const response = await fetch(registryUrl, { signal });

  if (!response.ok) throw new RegistryHttpError(response.status);

  return response.text();
}
