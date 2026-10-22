import { sessionRows } from '@repo/mocks/app';
import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import {
  meta as sessionRowTestMeta,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';

// A Regular row's Plan bar on a phone and a wide window.
const meta = { ...sessionRowTestMeta, title: 'Tests/Sessions/SessionRow/Plan' };

export default meta;

// A failed Plan keeps its bar but does not sweep.
export const FailedPlanStill: Story = {
  args: {
    session: { ...sessionRows.failed, plan: { done: 2, total: 3 } },
  },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.getByLabelText('Plan: 2 of 3 complete'),
      ).toBeVisible();
      await expect(
        canvas.queryByTestId('session-plan-sweep'),
      ).not.toBeInTheDocument();
    }
  },
};
