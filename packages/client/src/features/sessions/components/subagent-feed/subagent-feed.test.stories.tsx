import {
  eachLayout,
  layoutWidths,
  settleLayout,
} from '@repo/kit/mocks/story-layout';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { SubagentFeed } from './subagent-feed';
import { subagentFeedBackLabel } from './subagent-feed-header';
import {
  SubagentFeedInspector,
  SubagentFeedSheet,
} from './subagent-feed-presentations.mocks';
import {
  cancelledSubagent,
  emptyFeed,
  finishedFeed,
  finishedSubagent,
  liveRowName,
  noIncomingFeed,
  startingSubagent,
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

const childOutput = 'I’ll update both files and check their contents.';

const liveRow = { name: liveRowName };

const subagentHeading = { name: 'Find every Feed reader' };

// Only the Inspector draws the meta line; the Sheet's own header names the page instead.
const metaLine = async (
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
  wide: boolean,
  line: string,
): Promise<void> => {
  await (wide
    ? expect(canvas.getByText(line)).toBeVisible()
    : expect(canvas.queryByText(line)).toBeNull());
};

export const Running: Story = {
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(canvas.getAllByText(incomingMessage)[0]).toBeVisible();
      await expect(canvas.getByText(childOutput)).toBeVisible();
      await expect(canvas.getByRole('status', liveRow)).toBeVisible();
      await metaLine(canvas, wide, 'Running · 34s');
    }),
};

export const Finished: Story = {
  args: { subagent: finishedSubagent, feed: finishedFeed },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(canvas.getAllByText(incomingMessage)[0]).toBeVisible();
      await expect(canvas.queryByRole('status', liveRow)).toBeNull();
      await metaLine(canvas, wide, 'Finished · 1m 41s');
    }),
};

// Stopped part way: the meta line names that instead of Finished.
export const Cancelled: Story = {
  args: { subagent: cancelledSubagent, feed: finishedFeed },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await metaLine(canvas, wide, 'Cancelled · 34s');
    }),
};

// Just spawned: the live row alone, with nothing reported above it.
export const Empty: Story = {
  args: { subagent: startingSubagent, feed: emptyFeed },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        canvas.getByRole('status', { name: 'Starting 2s' }),
      ).toBeVisible();
      await expect(canvas.queryByText(incomingMessage)).toBeNull();
      await expect(canvas.queryByText(childOutput)).toBeNull();
      await metaLine(canvas, wide, 'Running · 2s');
    }),
};

// The Agent reported no incoming message, so the Feed starts with the Subagent's own output.
export const NoIncomingMessage: Story = {
  args: { feed: noIncomingFeed },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.queryByText(incomingMessage)).toBeNull();
      await expect(canvas.getByText(childOutput)).toBeVisible();
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

export const InTheInspector: Story = {
  render: (args) => <SubagentFeedInspector {...args} />,
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await expect(canvas.getByRole('heading', subagentHeading)).toBeVisible();
    await expect(canvas.getByText('Running · 34s')).toBeVisible();
    await expect(canvas.getAllByText(incomingMessage)[0]).toBeVisible();
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
