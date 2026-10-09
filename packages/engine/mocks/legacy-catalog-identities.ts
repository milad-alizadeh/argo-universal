import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';

const [historicalAgentId] = appFixtureAgentIds;
if (!historicalAgentId)
  throw new Error('App fixtures need the historical Agent identity');
export const legacyLocalAgentId = historicalAgentId;
export const legacyRegistryAgentId = `${historicalAgentId}-acp`;
