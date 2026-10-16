// Answers with the registry document's text; the registry reader parses it.
export type FetchAgents = (signal: AbortSignal) => Promise<string>;

export const fetchTimeoutMs = 30_000;

const registryUrl =
  'https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json';

export async function fetchAgents(signal: AbortSignal): Promise<string> {
  const response = await fetch(registryUrl, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(fetchTimeoutMs)]),
  });

  if (!response.ok)
    throw new Error(`Registry returned HTTP ${response.status}`);

  return response.text();
}
