import type { AccountInfo } from '@anthropic-ai/claude-agent-sdk';
import { expect, it } from 'vitest';
import { usesSubscription } from './account';

it.each([
  [
    'a subscription login',
    { subscriptionType: 'Claude Max', apiProvider: 'firstParty' },
    true,
  ],
  [
    'a subscription login that names no key',
    { subscriptionType: 'Claude Pro', apiKeySource: 'none' },
    true,
  ],
  ['no login', {}, false],
  ['a Console login', { apiKeySource: '/login managed key' }, false],
  [
    'a key helper beside a subscription',
    { subscriptionType: 'Claude Max', apiKeySource: 'apiKeyHelper' },
    false,
  ],
  ['a cloud provider', { apiProvider: 'bedrock' }, false],
] satisfies [string, AccountInfo, boolean][])(
  'accepts %s: %j → %s',
  (_, account, expected): void => {
    expect(usesSubscription(account)).toBe(expected);
  },
);
