export type AgentIdentity = { agent: string; label: string; logo: string };
export const createAgentMetadata = (agent = 'mock'): AgentIdentity => ({
  agent,
  label: agent,
  logo: '<svg xmlns="http://www.w3.org/2000/svg"/>',
});
