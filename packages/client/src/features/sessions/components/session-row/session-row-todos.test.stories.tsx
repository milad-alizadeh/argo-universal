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

const sweep = 'session-todos-sweep';

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
      await expect(canvas.queryByTestId(sweep)).not.toBeInTheDocument();
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
        await expect(canvas.queryByTestId(sweep)).not.toBeInTheDocument();
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

// The last plan step underway leaves its segment pale, so the bar never reads as full.
export const LastStepInProgress: Story = {
  args: {
    session: {
      ...sessionRows.running,
      plan: { done: 3, inProgress: 1, total: 4 },
    },
  },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await settleLayout(width);

      const bar = canvas.getByRole('progressbar', {
        name: 'Todos: 3 of 4 complete, 1 in progress',
      });

      await expect(bar).toHaveAttribute('aria-valuenow', '75');
      await expect(
        canvas.getAllByTestId('session-todos-step-done'),
      ).toHaveLength(3);
      await expect(
        canvas.getByTestId('session-todos-step-started'),
      ).toBeVisible();
      // A running Session's step underway glints.
      await expect(await canvas.findByTestId(sweep)).toBeInTheDocument();
    }
  },
};

export const LastStepInProgressDark: Story = {
  ...LastStepInProgress,
  globals: { mode: 'dark' },
};

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
      name: 'Todos: 0 of 3 complete, 1 in progress',
    });

    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('aria-valuenow', '0');
    await expect(
      canvas.getAllByTestId('session-todos-step-started'),
    ).toHaveLength(1);
    await expect(
      canvas.getAllByTestId('session-todos-step-pending'),
    ).toHaveLength(2);
  },
};
