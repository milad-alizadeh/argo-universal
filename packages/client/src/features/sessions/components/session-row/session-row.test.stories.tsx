import { pressTarget } from '@repo/kit/mocks/press-target';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { sessionRows } from '@repo/mocks/app';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  metadata,
  meta as sessionRowTestMeta,
  running,
  statusDots,
  statusParity,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';
import {
  archivedSession,
  coverageItem,
  issueItem,
  lintItem,
  longPluginItemsCompactSession,
  moreIssue,
  moreIssueItem,
  pluginActivitySession,
  pluginItemsCompactSession,
  pluginItemsSession,
  previewItem,
  rowIssue,
} from './session-row-fixtures';
import { type SessionRowProps, sessionRowLabel } from './session-row-props';
import { sessionRowMocks } from './session-row.mocks';

const meta = { ...sessionRowTestMeta, title: 'Tests/Sessions/SessionRow' };

export default meta;

export const Running = running;

// A screen reader reads a row through its press target's name, so the name carries what the row's lanes only draw.
const archivedName = { name: /, Archived$/ };

// The row draws its Plugin items as accessories, which leaves its press target without any content of its own.
function namedArchived(
  items: typeof archivedSession | typeof pluginItemsSession,
): Story {
  return {
    args: { ...items, session: sessionRows.archived },
    play: async ({ canvas }) => {
      await settleLayout('phone');
      await expect(canvas.getByRole('button', archivedName)).toBeVisible();
    },
  };
}

export const ArchivedNameWithItems = namedArchived(pluginItemsSession);

export const ArchivedName = namedArchived(archivedSession);

export const PluginItemTooltipWide: Story = {
  args: pluginItemsSession,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.hover(canvas.getByText(rowIssue));
    await expect(
      await within(document.body).findByRole('tooltip'),
    ).toHaveTextContent(issueItem.item.tooltip);
  },
};

// The link names its text and its Plugin.
const issueLink = { name: new RegExp(`^${rowIssue}, ${issueItem.pluginName}`) };

interface RowName {
  name: string;
}

const rowName = (session: SessionRowProps['session']): RowName => ({
  name: sessionRowLabel(session),
});

const idleRow = rowName(pluginItemsSession.session);

// Only an archived Session's row says so: a live row's name stops at its status.
export const LiveRowNameDoesNotSayArchived: Story = {
  args: pluginItemsSession,
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await expect(canvas.getByRole('button', idleRow)).toBeVisible();
    await expect(
      canvas.queryByRole('button', archivedName),
    ).not.toBeInTheDocument();
  },
};

const morePluginItems = { name: /^\d+ more items? from Plugins$/ };

export const PluginItems: Story = {
  args: { ...pluginItemsSession, onOpenPluginPage: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await settleLayout('phone');
    // Argo's own items and the row's identity stay as they were.
    await expect(canvas.getByRole('button', idleRow)).toBeVisible();
    await expect(canvas.getByLabelText(/Change #44$/)).toBeVisible();

    for (const { item } of pluginItemsSession.plugins.items)
      await expect(canvas.getByText(item.text)).toBeVisible();

    // Only an item with a page is a link, and pressing it opens that page, not the Session.
    await expect(canvas.getAllByRole('link')).toHaveLength(1);
    await userEvent.click(canvas.getByRole('link', issueLink));
    await expect(args.onOpenPluginPage).toHaveBeenCalledWith(
      issueItem.pluginId,
      issueItem.item.action.path,
    );
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

// An item with no page has no press of its own: pressing it, tooltip or not, opens the Session.
export const PlainItemsOpenTheSession: Story = {
  args: { ...pluginItemsSession, onOpenPluginPage: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await settleLayout('phone');

    for (const { item } of [previewItem, coverageItem])
      await userEvent.click(pressTarget(canvas.getByText(item.text)));

    await expect(args.onSelect).toHaveBeenCalledTimes(2);
    await expect(args.onSelect).toHaveBeenCalledWith(
      pluginItemsSession.session.sessionId,
    );
    await expect(args.onOpenPluginPage).not.toHaveBeenCalled();
  },
};

// "+N" lists each item that did not fit with its Plugin's name; one with a page opens it.
function moreItems(width: number): Story {
  return {
    args: { ...pluginItemsSession, onOpenPluginPage: fn() },
    play: async ({ canvas, userEvent, args }) => {
      await settleLayout(width);
      await expect(
        canvas.queryByText(lintItem.item.text),
      ).not.toBeInTheDocument();
      await userEvent.click(canvas.getByRole('button', morePluginItems));

      const more = await within(document.body).findByRole('dialog');

      // The popover fades in before its rows are visible.
      await waitFor(() =>
        expect(within(more).getByText(moreIssueItem.pluginName)).toBeVisible(),
      );

      await expect(within(more).getByText(lintItem.item.text)).toBeVisible();
      await expect(within(more).getByText(lintItem.pluginName)).toBeVisible();
      await userEvent.click(within(more).getByText(moreIssue));
      await expect(args.onOpenPluginPage).toHaveBeenCalledWith(
        moreIssueItem.pluginId,
        moreIssueItem.item.action.path,
      );
      await expect(args.onSelect).not.toHaveBeenCalled();
    },
  };
}

export const MorePluginItemsPhone = moreItems(layoutWidths.phone);

export const MorePluginItemsWide = moreItems(layoutWidths.wide);

// The chosen Plugin's line takes the place of Argo's; the status and title stay Argo's.
export const PluginActivityLine: Story = {
  args: pluginActivitySession,
  play: async ({ canvas }) => {
    await settleLayout('phone');
    await expect(
      canvas.getByText(pluginActivitySession.plugins.activity.text),
    ).toBeVisible();
    await expect(
      canvas.queryByText(pluginActivitySession.session.activity),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('button', rowName(pluginActivitySession.session)),
    ).toBeVisible();
  },
};

// A Compact row draws one item; the rest join "+N".
export const PluginItemsCompact: Story = {
  args: { ...pluginItemsCompactSession, onOpenPluginPage: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await settleLayout('wide');
    await expect(canvas.getByRole('link', issueLink)).toBeVisible();
    await expect(
      canvas.queryByText(previewItem.item.text),
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', morePluginItems)).toBeVisible();
    await userEvent.click(canvas.getByRole('link', issueLink));
    await expect(args.onOpenPluginPage).toHaveBeenCalledWith(
      issueItem.pluginId,
      issueItem.item.action.path,
    );
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

// Long items never squeeze a Compact row's title: it stays whole while the item truncates.
export const LongPluginItemsCompact: Story = {
  args: longPluginItemsCompactSession,
  play: async ({ canvas, userEvent, args }) => {
    const { session } = longPluginItemsCompactSession;

    await settleLayout('phone');
    await expect(canvas.getByText(session.title)).toBeVisible();
    await expect(canvas.getByRole('button', morePluginItems)).toBeVisible();
    await userEvent.click(pressTarget(canvas.getByText(session.title)));
    await expect(args.onSelect).toHaveBeenCalledWith(session.sessionId);
  },
};

export const Metadata = metadata;

export const PullRequestWithoutOtherMetadata: Story = {
  args: {
    session: sessionRows.idle,
    pullRequest: { number: 45, stage: 'open' },
  },
  play: async ({ canvas }) => {
    await settleLayout('phone');
    const pullRequest = canvas.getByLabelText('Open Change #45');
    await expect(pullRequest).toBeVisible();
    await expect(canvas.queryByLabelText(/^Todos:/)).not.toBeInTheDocument();
    await expect(canvas.queryByLabelText(/^Agents:/)).not.toBeInTheDocument();
    await expect(canvas.queryByLabelText(/^Issue #/)).not.toBeInTheDocument();
  },
};

export const StatusParity = statusParity;

// Time leads the meta line; a dot ends every row but an idle one's.
export const StatusDots = statusDots('regular');

export const PlanAndSubagents: Story = {
  args: {
    session: sessionRowMocks.planAndSubagents,
  },
  play: async ({ canvas }) => {
    await settleLayout('phone');
    await expect(canvas.getByLabelText('Todos: 2 of 5 complete')).toBeVisible();
    // A running Plan sweeps; a Regular row's Plan is a bar, with no step count.
    await expect(canvas.getByTestId('session-todos-sweep')).toBeVisible();
    await expect(canvas.queryByText('2/5')).not.toBeInTheDocument();
    await expect(canvas.getByLabelText('Agents: 2 running')).toHaveTextContent(
      '2',
    );
    await expect(canvas.getByTestId('subagents-status')).toBeVisible();
    await expect(
      canvas.getByLabelText('Background Tasks: 1 running'),
    ).toHaveTextContent('1');
    await expect(canvas.getByTestId('shells-status')).toBeVisible();
  },
};

export const NoPlanOrSubagents: Story = {
  args: { session: sessionRows.idle },
  play: async ({ canvas }) => {
    await settleLayout('phone');
    await expect(canvas.queryByLabelText(/^Todos:/)).not.toBeInTheDocument();
    await expect(canvas.queryByLabelText(/^Agents:/)).not.toBeInTheDocument();
    await expect(
      canvas.queryByTestId('session-issue-slot'),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByTestId('session-pull-request-slot'),
    ).not.toBeInTheDocument();
  },
};

export const FinishedSubagents: Story = {
  args: {
    session: sessionRowMocks.finishedSubagents,
  },
  play: async ({ canvas }) => {
    await settleLayout('phone');
    // A finished Plan leaves no bar.
    await expect(canvas.queryByLabelText(/^Todos:/)).not.toBeInTheDocument();
    await expect(canvas.queryByLabelText(/^Agents:/)).not.toBeInTheDocument();
    await expect(
      canvas.queryByLabelText(/^Background Tasks:/),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByTestId('shells-status')).not.toBeInTheDocument();
    await expect(
      canvas.queryByTestId('subagents-status'),
    ).not.toBeInTheDocument();
  },
};

export const LongTitleSelected: Story = {
  args: { session: sessionRows.longTitle, selected: true },
  play: async ({ canvas, userEvent, args }) => {
    await settleLayout('phone');

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
