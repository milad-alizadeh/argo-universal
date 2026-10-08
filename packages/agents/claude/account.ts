import type { AccountInfo } from '@anthropic-ai/claude-agent-sdk';

// A Claude subscription login with no API key in use (ADR-0004).
export const usesSubscription = (account: AccountInfo): boolean =>
  account.subscriptionType !== undefined &&
  (account.apiKeySource ?? 'none') === 'none';
