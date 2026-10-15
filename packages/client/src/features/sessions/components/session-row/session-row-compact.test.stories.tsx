import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import {
  meta as sessionRowTestMeta,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { sessionRowMocks } from './session-row.mocks';

// A Compact row's one line: the title, then its PR's state or how long ago the Session was active.
const meta = { ...sessionRowTestMeta, title: 'Tests/SessionRow Compact' };

export default meta;

const session = sessionRowMocks.planAndSubagents;

function compactPullRequest(width: number): Story {
  return {
    args: {
      session,
      layout: 'compact',
      pullRequest: { number: 45, status: 'open' },
      trailing: '12m',
    },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      // The PR's state, without its number; no Plan, activity, metadata or time.
      await expect(canvas.queryByText('#45')).not.toBeInTheDocument();
      await expect(canvas.queryByText('12m')).not.toBeInTheDocument();
      await expect(canvas.queryByLabelText(/^Plan:/)).not.toBeInTheDocument();
      await expect(
        canvas.queryByText(session.activity),
      ).not.toBeInTheDocument();
      await expect(
        canvas.queryByLabelText(/^Subagents:/),
      ).not.toBeInTheDocument();
      await userEvent.click(
        canvas.getByRole('button', {
          name: `${session.title}, Running, Open PR`,
        }),
      );
      await expect(args.onSelect).toHaveBeenCalledWith('session-plan');
    },
  };
}

export const CompactPullRequestPhone = compactPullRequest(layoutWidths.phone);

export const CompactPullRequestWide = compactPullRequest(layoutWidths.wide);

// With no PR, a Compact row ends with how long ago the Session was active.
export const CompactAge: Story = {
  args: { session, layout: 'compact', trailing: '12m' },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(canvas.getByText('12m')).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: `${session.title}, Running` }),
      ).toBeVisible();
    }
  },
};
