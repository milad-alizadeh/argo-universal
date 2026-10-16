import { expect } from 'storybook/test';
import {
  meta as sessionRowTestMeta,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';
import { eachLayout, layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { sessionRowMocks } from './session-row.mocks';

// A Compact row's one line: the title, then its PR's state or how long ago the Session was active.
const meta = { ...sessionRowTestMeta, title: 'Tests/SessionRow Compact' };

export default meta;

const session = sessionRowMocks.planAndSubagents;

const pullRequestArgs: Story['args'] = {
  session,
  layout: 'compact',
  pullRequest: { number: 45, status: 'open' },
  trailing: '12m',
};

const rowName = { name: `${session.title}, Running, Open PR` };

// The PR's state, without its number; no Plan, activity, metadata or time.
export const CompactPullRequest: Story = {
  args: pullRequestArgs,
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.getByRole('button', rowName)).toBeVisible();
      await expect(canvas.queryByText('#45')).not.toBeInTheDocument();
      await expect(canvas.queryByText('12m')).not.toBeInTheDocument();
      await expect(canvas.queryByLabelText(/^Plan:/)).not.toBeInTheDocument();
      await expect(
        canvas.queryByText(session.activity),
      ).not.toBeInTheDocument();
      await expect(
        canvas.queryByLabelText(/^Subagents:/),
      ).not.toBeInTheDocument();
    }),
};

function selectsCompactRow(width: number): Story {
  return {
    args: pullRequestArgs,
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', rowName));
      await expect(args.onSelect).toHaveBeenCalledWith('session-plan');
    },
  };
}

export const SelectsCompactRowPhone = selectsCompactRow(layoutWidths.phone);

export const SelectsCompactRowWide = selectsCompactRow(layoutWidths.wide);

// With no PR, a Compact row ends with how long ago the Session was active.
export const CompactAge: Story = {
  args: { session, layout: 'compact', trailing: '12m' },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.getByText('12m')).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: `${session.title}, Running` }),
      ).toBeVisible();
    }),
};
