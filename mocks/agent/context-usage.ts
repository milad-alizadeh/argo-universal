import type { UsageUpdate } from '@agentclientprotocol/sdk';

export const contextUsageFixtures = {
  low: { used: 20_000, size: 200_000 },
  high: { used: 170_000, size: 200_000 },
  full: { used: 200_000, size: 200_000 },
} satisfies Record<string, UsageUpdate>;
