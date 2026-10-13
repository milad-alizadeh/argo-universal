import { expect } from 'storybook/test';
import type { PlayContext } from './composer-story-context.test.mocks';
import { agentModelLabel } from './composer-test-contract.test.mocks';

export async function expectAgentTextFits(
  canvas: PlayContext['canvas'],
): Promise<void> {
  for (const text of canvas
    .getByRole('button', { name: agentModelLabel })
    .querySelectorAll('[dir]')) {
    await expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth + 1);
  }
}
