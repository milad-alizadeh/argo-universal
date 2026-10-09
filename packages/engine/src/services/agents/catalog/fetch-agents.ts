export type FetchAgents = (signal: AbortSignal) => Promise<unknown>;

export const registryUrl =
  'https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json';

export async function fetchAgents(signal: AbortSignal): Promise<unknown> {
  const response = await fetch(registryUrl, { signal });
  if (!response.ok)
    throw new Error(`Registry returned HTTP ${response.status}`);
  return response.text();
}
