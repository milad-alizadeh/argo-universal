import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { sessionRows } from '@repo/mocks/app';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  dark,
  metadata,
  meta as sessionRowTestMeta,
  running,
  statusDots,
  statusParity,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';
import {
  moreIssue,
  pluginActivitySession,
  pluginItemsCompactSession,
  pluginItemsSession,
  rowIssue,
} from './session-row-fixtures';
import { sessionRowMocks } from './session-row.mocks';

const meta = { ...sessionRowTestMeta, title: 'Tests/Sessions/SessionRow' };

export default meta;

export const RunningPhone = running(layoutWidths.phone);

export const RunningWide = running(layoutWidths.wide);

export const Archived: Story = {
  args: { session: sessionRows.archived },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await settleLayout(width);
      await expect(canvas.getByText('Archived', { exact: true })).toBeVisible();
    }
  },
};

export const PluginItemTooltipWide: Story = {
  args: pluginItemsSession,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.hover(canvas.getByText(rowIssue));
    await expect(
      await within(document.body).findByRole('tooltip'),
    ).toHaveTextContent('Issue #412: Sync fails on large repos');
  },
};

const issueLink = new RegExp(`^${rowIssue},`);

const issueTracker = 'issue-tracker';

const idleRowName = `${pluginItemsSession.session.title}, Idle`;

function pluginItems(width: number): Story {
  return {
    args: { ...pluginItemsSession, onOpenPluginPage: fn() },
    play: async ({ canvas, userEvent, args }) => {
      await settleLayout(width);
      // Argo's own items and the row's identity stay as they were.
      await expect(
        canvas.getByRole('button', { name: idleRowName }),
      ).toBeVisible();
      await expect(canvas.getByLabelText('Merged Change #44')).toBeVisible();

      for (const text of [rowIssue, 'Preview ready', '78%'])
        await expect(canvas.getByText(text)).toBeVisible();

      // Only an item with a page is a link, and pressing it opens that page, not the Session.
      await expect(canvas.getAllByRole('link')).toHaveLength(1);
      await userEvent.click(canvas.getByRole('link', { name: issueLink }));
      await expect(args.onOpenPluginPage).toHaveBeenCalledWith(
        issueTracker,
        '/issues/412',
      );
      await expect(args.onSelect).not.toHaveBeenCalled();
    },
  };
}

export const PluginItemsPhone = pluginItems(layoutWidths.phone);

export const PluginItemsWide = pluginItems(layoutWidths.wide);

// "+2" lists each item that did not fit with its Plugin's name; one with a page opens it.
function moreItems(width: number): Story {
  return {
    args: { ...pluginItemsSession, onOpenPluginPage: fn() },
    play: async ({ canvas, userEvent, args }) => {
      await settleLayout(width);
      await expect(canvas.queryByText('Lint passed')).not.toBeInTheDocument();
      await userEvent.click(
        canvas.getByRole('button', { name: '2 more items from Plugins' }),
      );

      const more = await within(document.body).findByRole('dialog', {
        name: '2 more on this Session',
      });

      // The popover fades in before its rows are visible.
      await waitFor(() =>
        expect(within(more).getByText('Issue tracker')).toBeVisible(),
      );

      await expect(within(more).getByText('Lint passed')).toBeVisible();
      await expect(within(more).getByText('Checks')).toBeVisible();
      await expect(within(more).getByText(moreIssue)).toBeVisible();
      await userEvent.click(within(more).getByText(moreIssue));
      await expect(args.onOpenPluginPage).toHaveBeenCalledWith(
        issueTracker,
        '/issues/398',
      );
      await expect(args.onSelect).not.toHaveBeenCalled();
    },
  };
}

export const MorePluginItemsPhone = moreItems(layoutWidths.phone);

export const MorePluginItemsWide = moreItems(layoutWidths.wide);

export const PluginActivityLine: Story = {
  args: pluginActivitySession,
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await settleLayout(width);
      await expect(
        canvas.getByText(pluginActivitySession.plugins.activity.text),
      ).toBeVisible();
      await expect(
        canvas.queryByText(pluginActivitySession.session.activity),
      ).not.toBeInTheDocument();
      // The status and title stay Argo's.
      await expect(
        canvas.getByRole('button', {
          name: `${pluginActivitySession.session.title}, Running`,
        }),
      ).toBeVisible();
    }
  },
};

export const ArgosActivityLineWithoutAPluginLine: Story = {
  args: pluginItemsSession,
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await expect(
      canvas.getByText(pluginItemsSession.session.activity),
    ).toBeVisible();
  },
};

export const PluginItemsCompact: Story = {
  args: { ...pluginItemsCompactSession, onOpenPluginPage: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await settleLayout('wide');
    await expect(canvas.getByText(rowIssue)).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: '2 more items from Plugins' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('link', { name: issueLink }));
    await expect(args.onOpenPluginPage).toHaveBeenCalledWith(
      issueTracker,
      '/issues/412',
    );
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

export const MetadataPhone = metadata(layoutWidths.phone);

export const MetadataWide = metadata(layoutWidths.wide);

export const PullRequestWithoutOtherMetadata: Story = {
  args: {
    session: sessionRows.idle,
    pullRequest: { number: 45, stage: 'open' },
  },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await settleLayout(width);
      const pullRequest = canvas.getByLabelText('Open Change #45');
      await expect(pullRequest).toBeVisible();
      await expect(canvas.queryByLabelText(/^Plan:/)).not.toBeInTheDocument();
      await expect(canvas.queryByLabelText(/^Agents:/)).not.toBeInTheDocument();
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
      await settleLayout(width);
      await expect(
        canvas.getByLabelText('Plan: 2 of 5 complete'),
      ).toBeVisible();
      // A running Plan sweeps; a Regular row's Plan is a bar, with no step count.
      await expect(canvas.getByTestId('session-plan-sweep')).toBeVisible();
      await expect(canvas.queryByText('2/5')).not.toBeInTheDocument();
      await expect(canvas.getByLabelText('Agents: 3, 2 running')).toBeVisible();
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
      await settleLayout(width);
      await expect(canvas.queryByLabelText(/^Plan:/)).not.toBeInTheDocument();
      await expect(canvas.queryByLabelText(/^Agents:/)).not.toBeInTheDocument();
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
      await settleLayout(width);
      // A finished Plan leaves no bar.
      await expect(canvas.queryByLabelText(/^Plan:/)).not.toBeInTheDocument();
      await expect(canvas.getByLabelText('Agents: 3, 0 running')).toBeVisible();
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
      await settleLayout(width);

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
