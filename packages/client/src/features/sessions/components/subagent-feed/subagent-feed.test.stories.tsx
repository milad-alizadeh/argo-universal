import { eachLayout, settleLayout } from '@repo/kit/mocks/story-layout';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { SubagentFeed } from './subagent-feed';
import { subagentFeedBackLabel } from './subagent-feed-header';
import { subagentFeedMeta } from './subagent-feed-meta';
import {
  SubagentFeedInspector,
  SubagentFeedSheet,
} from './subagent-feed-presentations.mocks';
import {
  emptyFeed,
  finishedSubagent,
  ownReplyFeed,
  reportedFeed,
  runningSubagent,
  startingSubagent,
  subagentFeedNow,
} from './subagent-feed.mocks';
import feedMeta from './subagent-feed.stories';

const meta = {
  ...feedMeta,
  title: 'Tests/Sessions/SubagentFeed',
  args: { ...feedMeta.args, onBack: fn() },
};

export default meta;

type Story = StoryObj<typeof meta>;

const incomingMessage = /^Use apply_patch to change beta to gamma/;

const reportedText = 'Two packages.';

const subagentHeading = { name: 'Find every Feed reader' };

const runningMeta = subagentFeedMeta(runningSubagent, subagentFeedNow);

// Only the Inspector draws the meta line; the Sheet's own header names the page instead.
export const MetaLineOnlyInTheInspector: Story = {
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await waitFor(() =>
        wide
          ? expect(canvas.getByText(runningMeta)).toBeVisible()
          : expect(canvas.queryByText(runningMeta)).toBeNull(),
      );
    }),
};

export const BackToTheList: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await settleLayout('wide');
    await userEvent.click(
      canvas.getByRole('button', { name: subagentFeedBackLabel }),
    );
    await expect(args.onBack).toHaveBeenCalled();
  },
};

// The pushed page draws the Subagent's title and Back, and goes back to the list.
export const AsAPageSheet: Story = {
  render: (args) => <SubagentFeedSheet {...args} />,
  play: async ({ userEvent }) => {
    await settleLayout('phone');
    await expect(
      await screen.findByRole('heading', subagentHeading),
    ).toBeVisible();
    // A row shows once the list has placed it, a frame after the page opens.
    await waitFor(() =>
      expect(screen.getAllByText(incomingMessage)[0]).toBeVisible(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: subagentFeedBackLabel }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('heading', subagentHeading)).toBeNull(),
    );
  },
};

// A short Subagent Feed has no Composer to rest against, so its first row sits at the top of the Feed, not at the bottom.
const startsAtTheTop = async (
  within: Pick<typeof screen, 'findByTestId' | 'getByRole'>,
): Promise<void> => {
  const row = within.getByRole('status', { name: 'Starting 2s' });
  const scroll = await within.findByTestId('feed-scroll');
  const rowBox = row.getBoundingClientRect();
  const scrollBox = scroll.getBoundingClientRect();

  await expect(rowBox.top - scrollBox.top).toBeLessThan(
    scrollBox.bottom - rowBox.bottom,
  );
};

export const StartsAtTheTopInTheInspector: Story = {
  args: { subagent: startingSubagent, feed: emptyFeed },
  render: (args) => <SubagentFeedInspector {...args} />,
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await startsAtTheTop(canvas);
  },
};

// The phone Sheet's pushed page at full height: the Feed fills a viewport taller than its rows.
export const StartsAtTheTopOnAPhone: Story = {
  args: { subagent: startingSubagent, feed: emptyFeed },
  render: (args) => (
    <View className="h-175">
      <SubagentFeed {...args} />
    </View>
  ),
  play: async ({ canvas }) => {
    await settleLayout('phone');
    await startsAtTheTop(canvas);
  },
};

export const ParentReportedResult: Story = {
  args: {
    subagent: finishedSubagent,
    feed: reportedFeed,
  },
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await expect(
      canvas.getByText('Reported to the parent Session'),
    ).toBeVisible();
    await expect(canvas.getByText(reportedText)).toBeVisible();
    await expect(canvas.getByText('Review complete.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Source' })).toBeVisible();
  },
};

export const ChildReportedResult: Story = {
  args: { subagent: finishedSubagent, feed: ownReplyFeed },
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await expect(canvas.getByText('Sent by this Agent')).toBeVisible();
    await expect(canvas.getByText(reportedText)).toBeVisible();
    await expect(
      canvas.queryByText('Reported to the parent Session'),
    ).toBeNull();
  },
};

export const EarlierReports: Story = {
  args: { feed: reportedFeed, loadEarlierReports: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await settleLayout('wide');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Load earlier reports' }),
    );
    await expect(args.loadEarlierReports).toHaveBeenCalled();
  },
};
