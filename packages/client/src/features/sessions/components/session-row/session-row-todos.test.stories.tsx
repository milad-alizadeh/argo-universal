import { settleLayout } from '@repo/kit/mocks/story-layout';
import { sessionRows } from '@repo/mocks/app';
import { expect } from 'storybook/test';
import {
  meta as sessionRowTestMeta,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';

// A Regular row's checklist bar on a phone and a wide window.
const meta = {
  ...sessionRowTestMeta,
  title: 'Tests/Sessions/SessionRow/Todos',
};

export default meta;

// A failed checklist keeps its bar but does not sweep.
export const FailedTodosStill: Story = {
  args: {
    session: { ...sessionRows.failed, plan: { done: 2, total: 3 } },
  },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await settleLayout(width);
      await expect(
        canvas.getByLabelText('Todos: 2 of 3 complete'),
      ).toBeVisible();
      await expect(
        canvas.queryByTestId('session-todos-sweep'),
      ).not.toBeInTheDocument();
    }
  },
};
