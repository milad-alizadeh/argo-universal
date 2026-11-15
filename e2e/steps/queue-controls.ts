import { expect } from '../fixtures';
import { Then } from './fixtures';

Then('queue icons explain their actions', async ({ page }): Promise<void> => {
  const queue = page.getByTestId('prompt-queue');

  for (const label of ['Edit', 'Delete']) {
    await queue
      .getByRole('button', { name: `${label} Queued Prompt`, exact: true })
      .first()
      .hover();
    await expect(
      page.getByRole('tooltip').getByText(label, { exact: true }),
    ).toBeVisible();
  }

  await expect(queue.getByTestId('queue-reorder-grip').first()).toBeVisible();
});

Then(
  'the queue offers no unsupported steering',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByTestId('prompt-queue').getByRole('button', { name: /steer/i }),
    ).toHaveCount(0);
  },
);
