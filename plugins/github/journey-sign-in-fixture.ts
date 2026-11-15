import type { PluginTest } from '@argo/plugin-kit/testing';
import { expect } from 'vitest';

const pollMs = 1000;

const pollLimit = 5;

const accountWaitMs = 5000;

export const provider = 'issue-tracker';

// Signs in through the Issue tracker, the Plugin that provides the GitHub Account this Plugin only borrows.
export async function signIn(test: PluginTest): Promise<void> {
  await test.operations.run({ name: 'signIn', pluginId: provider });

  for (let poll = 0; poll < pollLimit; poll += 1) {
    await test.clock.advance(pollMs);
  }

  // The worker stores the Account after its last poll answers, so it can land a moment after the clock stops.
  await expect
    .poll(() => test.accounts.list().length, { timeout: accountWaitMs })
    .toBe(1);
}
