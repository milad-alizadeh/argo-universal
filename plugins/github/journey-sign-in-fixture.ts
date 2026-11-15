import type { PluginTest } from '@argo/plugin-kit/testing';
import { expect } from 'vitest';

const pollMs = 1000;

const signInWaitMs = 10_000;

export const provider = 'issue-tracker';

// Signs in through the Issue tracker, the Plugin that provides the GitHub Account this Plugin only borrows.
export async function signIn(test: PluginTest): Promise<void> {
  await test.operations.run({ name: 'signIn', pluginId: provider });

  await expect
    .poll(
      async () => {
        await test.clock.advance(pollMs);

        return test.accounts.list();
      },
      { timeout: signInWaitMs },
    )
    .toHaveLength(1);
}
