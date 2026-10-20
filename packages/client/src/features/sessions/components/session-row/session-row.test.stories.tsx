import { sessionRows } from '@repo/mocks/app';
import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import {
  dark,
  metadata,
  meta as sessionRowTestMeta,
  running,
  statusDots,
  statusParity,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { sessionRowMocks } from './session-row.mocks';

const meta = { ...sessionRowTestMeta, title: 'Tests/SessionRow' };

export default meta;

export const RunningPhone = running(layoutWidths.phone);

export const RunningWide = running(layoutWidths.wide);

export const Archived: Story = {
  args: { session: sessionRows.archived },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(canvas.getByText('Archived', { exact: true })).toBeVisible();
    }
  },
};

export const MetadataPhone = metadata(layoutWidths.phone);

export const MetadataWide = metadata(layoutWidths.wide);

export const PullRequestWithoutOtherMetadata: Story = {
  args: {
    session: sessionRows.idle,
    pullRequest: { number: 45, status: 'open' },
  },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const pullRequest = canvas.getByLabelText('open PR #45');
      await expect(pullRequest).toBeVisible();
      await expect(canvas.queryByLabelText(/^Plan:/)).not.toBeInTheDocument();
      await expect(
        canvas.queryByLabelText(/^Subagents:/),
      ).not.toBeInTheDocument();
      await expect(canvas.queryByLabelText(/^Issue #/)).not.toBeInTheDocument();
    }
  },
};

export const PullRequestWithoutOtherMetadataDark: Story = {
  ...PullRequestWithoutOtherMetadata,
  ...dark,
};

export const StatusParity = statusParity;

// Time leads the meta line; a dot ends every row but an idle one's.
export const StatusDots = statusDots('regular');

export const PlanAndSubagents: Story = {
  args: {
    session: sessionRowMocks.planAndSubagents,
  },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.getByLabelText('Plan: 2 of 5 complete'),
      ).toBeVisible();
      // A running Plan sweeps; a Regular row's Plan is a bar, with no step count.
      await expect(canvas.getByTestId('session-plan-sweep')).toBeVisible();
      await expect(canvas.queryByText('2/5')).not.toBeInTheDocument();
      await expect(
        canvas.getByLabelText('Subagents: 3, 2 running'),
      ).toBeVisible();
      // The web's sidebar row draws the count alone; its own status dot speaks for the Session.
      await expect(
        canvas.queryByTestId('subagents-status'),
      ).not.toBeInTheDocument();
    }
  },
};

export const NoPlanOrSubagents: Story = {
  args: { session: sessionRows.idle },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(canvas.queryByLabelText(/^Plan:/)).not.toBeInTheDocument();
      await expect(
        canvas.queryByLabelText(/^Subagents:/),
      ).not.toBeInTheDocument();
      await expect(
        canvas.queryByTestId('session-issue-slot'),
      ).not.toBeInTheDocument();
      await expect(
        canvas.queryByTestId('session-pull-request-slot'),
      ).not.toBeInTheDocument();
    }
  },
};

export const FinishedSubagents: Story = {
  args: {
    session: sessionRowMocks.finishedSubagents,
  },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      // A finished Plan leaves no bar.
      await expect(canvas.queryByLabelText(/^Plan:/)).not.toBeInTheDocument();
      await expect(
        canvas.getByLabelText('Subagents: 3, 0 running'),
      ).toBeVisible();
      await expect(
        canvas.queryByTestId('subagents-status'),
      ).not.toBeInTheDocument();
    }
  },
};

function longTitleSelected(width: number): Story {
  return {
    args: { session: sessionRows.longTitle, selected: true },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);

      const row = canvas.getByRole('button', {
        name: `${sessionRows.longTitle.title}, Idle`,
      });

      await expect(row).toHaveAttribute('aria-pressed', 'true');
      const title = canvas.getByText(sessionRows.longTitle.title);
      await expect(title).toBeVisible();
      await expect(args.onSelect).not.toHaveBeenCalled();
      await userEvent.click(row);
      await expect(args.onSelect).toHaveBeenCalledWith('session-long-title');
    },
  };
}

export const LongTitleSelectedPhone = longTitleSelected(layoutWidths.phone);

export const LongTitleSelectedWide = longTitleSelected(layoutWidths.wide);

export const StatusParityDark: Story = { ...StatusParity, ...dark };

export const RunningPhoneDark: Story = { ...RunningPhone, ...dark };

export const RunningWideDark: Story = { ...RunningWide, ...dark };

export const PlanAndSubagentsDark: Story = { ...PlanAndSubagents, ...dark };

export const NoPlanOrSubagentsDark: Story = { ...NoPlanOrSubagents, ...dark };

export const FinishedSubagentsDark: Story = { ...FinishedSubagents, ...dark };

export const LongTitleSelectedPhoneDark: Story = {
  ...LongTitleSelectedPhone,
  ...dark,
};

export const LongTitleSelectedWideDark: Story = {
  ...LongTitleSelectedWide,
  ...dark,
};

export const ArchivedDark: Story = { ...Archived, ...dark };

export const MetadataPhoneDark: Story = { ...MetadataPhone, ...dark };

export const MetadataWideDark: Story = { ...MetadataWide, ...dark };
