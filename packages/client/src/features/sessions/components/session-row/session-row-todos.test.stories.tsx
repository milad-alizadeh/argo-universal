import type { SessionInfo } from '@repo/contracts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { sessionRows } from '@repo/mocks/app';
import { expect } from 'storybook/test';
import {
  meta as sessionRowTestMeta,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';
import {
  backgroundWorkSession,
  todosLeftSession,
} from './session-row-todos-fixtures';

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

// A Turn that ended while background work runs keeps its bar and the count's dot, with no sweep and no status dot.
function backgroundWorkStill(session: SessionInfo, runningDot: string): Story {
  return {
    args: { session },
    play: async ({ canvas }) => {
      for (const width of [390, 1440]) {
        await settleLayout(width);
        await expect(
          canvas.getByLabelText('Todos: 3 of 5 complete'),
        ).toBeVisible();
        await expect(canvas.getByTestId(runningDot)).toBeVisible();
        await expect(
          canvas.queryByTestId('session-todos-sweep'),
        ).not.toBeInTheDocument();
        await expect(
          canvas.queryByTestId('session-status'),
        ).not.toBeInTheDocument();
      }
    },
  };
}

export const BackgroundTaskStill: Story = backgroundWorkStill(
  backgroundWorkSession.session,
  'shells-status',
);

export const AgentStill: Story = backgroundWorkStill(
  {
    ...todosLeftSession.session,
    subagents: { running: 1, total: 1 },
  },
  'subagents-status',
);

export const FirstStepInProgress: Story = {
  args: {
    session: {
      ...sessionRows.failed,
      status: 'running',
      plan: { done: 0, inProgress: 1, total: 3 },
    },
  },
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar', {
      name: 'Todos: 1 of 3 started',
    });

    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('aria-valuenow', '33');
  },
};
