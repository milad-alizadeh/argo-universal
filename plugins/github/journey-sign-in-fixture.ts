import type { PluginTest } from '@argo/plugin-kit/testing';
import { expect } from 'vitest';

const pollMs = 1000;

const accountWaitMs = 10_000;

export const provider = 'issue-tracker';

export async function signIn(test: PluginTest): Promise<void> {
  await test.operations.run({ name: 'signIn', pluginId: provider });

  await expect
    .poll(
      async () => {
        await test.clock.advance(pollMs);

        return test.accounts.list();
      },
      { timeout: accountWaitMs },
    )
    .toHaveLength(1);
}
