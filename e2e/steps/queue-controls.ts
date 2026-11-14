import { expect } from '../fixtures';
import { Then } from './fixtures';

Then('queue icons explain their actions', async ({ page }): Promise<void> => {
  const queue = page.getByTestId('prompt-queue');

  for (const name of [
    'Edit Queued Prompt',
    'Delete Queued Prompt',
    'Move Prompt down',
  ]) {
    await queue.getByRole('button', { name, exact: true }).first().hover();
    await expect(
      page.getByRole('tooltip').getByText(name, { exact: true }),
    ).toBeVisible();
  }
});

Then(
  'the queue offers no unsupported steering',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByTestId('prompt-queue').getByRole('button', { name: /steer/i }),
    ).toHaveCount(0);
  },
);
