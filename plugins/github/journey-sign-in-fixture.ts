import type { PluginTest } from '@argo/plugin-kit/testing';
import { expect } from 'vitest';

const pollMs = 1000;

const pollLimit = 5;

export const provider = 'issue-tracker';

// Signs in through the Issue tracker, waiting for the device flow's last poll to add the Account.
export async function signIn(test: PluginTest): Promise<void> {
  await test.operations.run({ name: 'signIn', pluginId: provider });

  await test.clock.until(() => test.accounts.list().length > 0, {
    stepMs: pollMs,
    steps: pollLimit,
  });

  expect(test.accounts.list()).toHaveLength(1);
}
