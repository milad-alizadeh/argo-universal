import { eachLayout, settleLayout } from '@repo/kit/mocks/story-layout';
import { Button } from '@repo/kit/primitives/actions/button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { Feed } from './feed';
import {
  afterTwoFrames,
  driftWhileUntouched,
  earlierFeedLoadingLabel,
  feedScrollId,
  fullyInViewport,
  markSettledMiddleOfView,
  readBackToSplitGroup,
  scrollAwayWait,
  scrolledToEnd,
  scrollToTop,
  scrollUp,
  openedRow,
} from './feed-reader.mocks';
import { settledTopOf } from './feed-settled-top.mocks';
import {
  longRows,
  olderPromptRows,
  oldestMessage,
  splitGroupRows,
  splitGroupLastStep,
  splitGroupStepInTail,
} from './feed.mocks';
import { feedArgs, PagedFeed, sendOlderPage } from './paged-feed.mocks';

const meta = {
  title: 'Tests/Feed',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LoadingEarlier: Story = {
  args: { loadingOlder: true },
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId(feedScrollId);
    await eachLayout(async () => {
      await scrollToTop(scroll);

      const indicator = await canvas.findByRole('progressbar', {
        name: earlierFeedLoadingLabel,
      });

      await waitFor(() => expect(fullyInViewport(indicator)).toBe(true));
    });
  },
};

export const PagesOlderRows: Story = {
  render: (args) => <PagedFeed {...args} rows={longRows} />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId(feedScrollId);
    const feed = within(scroll);
    await expect(feed.queryAllByText(oldestMessage)).toHaveLength(0);
    // Reads back a screen at a time, as a reader does, until the oldest page has loaded and drawn.
    await waitFor(async () => {
      scrollUp(scroll, scroll.clientHeight);
      await expect(feed.queryAllByText(oldestMessage).length).toBeGreaterThan(
        0,
      );
    }, scrollAwayWait);
  },
};

export const KeepsPlaceWhenOlderRowsLoad: Story = {
  render: (args) => <PagedFeed {...args} rows={longRows} holdOlderPages />,
  play: async ({ canvas }) => {
    await settleLayout('phone');
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    // At the top, the page before is already on its way.
    await scrollToTop(scroll);
    await expect(
      canvas.getByRole('progressbar', { name: earlierFeedLoadingLabel }),
    ).toBeVisible();
    // A screen down, past the top group, which an older page can extend.
    scroll.scrollTop = scroll.clientHeight;
    scroll.dispatchEvent(new Event('scroll'));
    const marked = await markSettledMiddleOfView(scroll);
    const heightBefore = scroll.scrollHeight;
    sendOlderPage();
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(heightBefore),
    );
    // Older rows draw above what the reader is reading, which stays where it was once they measure.
    await markSettledMiddleOfView(scroll);
    await expect(
      Math.abs(marked.element.getBoundingClientRect().top - marked.top),
    ).toBeLessThan(2);
    // And they leave it there: nothing scrolls the Feed back to its newest row once the page has landed.
    await expect(await driftWhileUntouched(marked)).toBeLessThan(2);
    await expect(scrolledToEnd(scroll)).toBe(false);
  },
};

// The Feed opens on a newest page with no prompt in it, so the older page carries the Turn's one prompt in from history.
export const KeepsPlaceWhenAnOlderPromptLoads: Story = {
  render: (args) => (
    <PagedFeed {...args} rows={olderPromptRows} holdOlderPages />
  ),
  play: async ({ canvas }) => {
    await settleLayout('phone');
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    await scrollToTop(scroll);
    // A screen down from the top, where an older page draws above what is being read.
    scroll.scrollTop = scroll.clientHeight;
    scroll.dispatchEvent(new Event('scroll'));

    const marked = await markSettledMiddleOfView(scroll);
    const heightBefore = scroll.scrollHeight;
    sendOlderPage();
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(heightBefore),
    );
    // The prompt that arrived is history, not one the reader sent: it pins nothing and the Feed stays where it was.
    await expect(await driftWhileUntouched(marked)).toBeLessThan(2);
    await expect(scrolledToEnd(scroll)).toBe(false);
  },
};

// The newest page starts partway through a Tool call group, so the older page gives that group its first rows.
export const KeepsPlaceWhenOlderRowsJoinAGroup: Story = {
  render: (args) => (
    <PagedFeed {...args} rows={splitGroupRows} holdOlderPages />
  ),
  play: async ({ canvas, userEvent }) => {
    const { header } = await readBackToSplitGroup(canvas);
    await expect(
      canvas.getByRole('progressbar', { name: earlierFeedLoadingLabel }),
    ).toBeVisible();
    // The reader opens the group and reads one of its commands.
    await userEvent.click(header);

    const step = (): HTMLElement =>
      canvas.getByRole('button', { name: splitGroupStepInTail });

    // The group has opened down to its last command before the older rows arrive.
    await openedRow(header, () =>
      canvas.getByRole('button', { name: splitGroupLastStep }),
    );
    const top = await settledTopOf(step);
    sendOlderPage();
    // The group gains its first ten commands above, stays open, and the command being read stays where it was.
    await expect(
      await canvas.findByRole('button', { name: 'Step 1' }),
    ).toBeVisible();
    await expect(Math.abs((await settledTopOf(step)) - top)).toBeLessThan(2);
  },
};

function ReopenedFeed({
  sessionId = 'restored-feed-test',
}: {
  sessionId?: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Button
        label={switchSessionLabel}
        onPress={() => setOpen((current) => !current)}
      />
      {open && <Feed {...feedArgs} sessionId={sessionId} />}
    </>
  );
}

export const RestoresReadingAfterRemount: Story = {
  render: () => <ReopenedFeed />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(
      () => expect(scrolledToEnd(scroll)).toBe(true),
      scrollAwayWait,
    );
    await waitFor(async () => {
      scrollUp(scroll, scroll.clientHeight);
      await expect(scrolledToEnd(scroll)).toBe(false);
    }, scrollAwayWait);
    await afterTwoFrames();
    const distance = scroll.scrollHeight - scroll.scrollTop;
    await userEvent.click(
      canvas.getByRole('button', { name: switchSessionLabel }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: switchSessionLabel }),
    );
    const restored = await canvas.findByTestId(feedScrollId);
    await waitFor(
      () =>
        expect(
          Math.abs(restored.scrollHeight - restored.scrollTop - distance),
        ).toBeLessThan(50),
      scrollAwayWait,
    );
  },
};

export const UserScrollStopsRestoring: Story = {
  render: () => <ReopenedFeed sessionId="restore-user-scroll-test" />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const original = await canvas.findByTestId(feedScrollId);
    await waitFor(
      () => expect(scrolledToEnd(original)).toBe(true),
      scrollAwayWait,
    );
    scrollUp(original, original.clientHeight);
    await afterTwoFrames();
    await userEvent.click(
      canvas.getByRole('button', { name: switchSessionLabel }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: switchSessionLabel }),
    );
    const restored = await canvas.findByTestId(feedScrollId);
    await afterTwoFrames();
    scrollUp(restored, restored.clientHeight);
    const chosen = await markSettledMiddleOfView(restored);
    await expect(await driftWhileUntouched(chosen)).toBeLessThan(3);
  },
};

const switchSessionLabel = 'Switch Session';

function ReopenedPagedFeed(): React.JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Button
        label={switchSessionLabel}
        onPress={() => setOpen((current) => !current)}
      />
      {open && (
        <PagedFeed
          {...feedArgs}
          rows={longRows}
          pageLength={60}
          sessionId="restored-older-feed-test"
        />
      )}
    </>
  );
}

export const RestoresOlderReadingAfterRemount: Story = {
  render: () => <ReopenedPagedFeed />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(
      () => expect(scrolledToEnd(scroll)).toBe(true),
      scrollAwayWait,
    );
    /*
     * Jump to the top of each loaded page, as a reader can with the scrollbar.
     * Each prepend moves the viewport down, so continue until the oldest row arrives.
     */
    await waitFor(async () => {
      scrollUp(scroll, scroll.scrollHeight);
      await afterTwoFrames();
      await expect(scroll.scrollTop).toBe(0);
      await expect(
        within(scroll).getAllByText(oldestMessage).length,
      ).toBeGreaterThan(0);
    }, scrollAwayWait);
    scrollUp(scroll, -300);
    await afterTwoFrames();
    const before = await markSettledMiddleOfView(scroll);
    const text = before.element.textContent;
    await userEvent.click(
      canvas.getByRole('button', { name: switchSessionLabel }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: switchSessionLabel }),
    );
    const restored = await canvas.findByTestId(feedScrollId);
    await waitFor(
      () =>
        expect(
          within(restored).getAllByText(oldestMessage).length,
        ).toBeGreaterThan(0),
      scrollAwayWait,
    );
    await waitFor(
      () => expect(restored.scrollTop).toBeGreaterThan(250),
      scrollAwayWait,
    );
    await expect(restored.scrollTop).toBeLessThan(350);
    await waitFor(async () => {
      const after = await markSettledMiddleOfView(restored);
      await expect(after.element.textContent).toBe(text);
      await expect(Math.abs(after.top - before.top)).toBeLessThan(3);
    }, scrollAwayWait);
  },
};

const deepMessage = 'The first message in the deep Feed.';

const firstDeepRow = longRows.find(
  (row) => row.sessionUpdate === 'user_message',
);

if (!firstDeepRow) throw new Error('The long Feed needs a prompt');

const deepRows = Array.from({ length: 105 }, (_, index) => ({
  ...firstDeepRow,
  id: `deep-${index}`,
  messageId: `deep-message-${index}`,
  turnId: `deep-turn-${index}`,
  position: index,
  revision: index + 1,
  content: [
    {
      type: 'text' as const,
      text: index === 0 ? deepMessage : `Message ${index}`,
    },
  ],
}));

function DeepReopenedFeed(): React.JSX.Element {
  const [open, setOpen] = useState(true);
  const [reopened, setReopened] = useState(false);

  return (
    <>
      <Button
        label={switchSessionLabel}
        onPress={() => {
          if (open) setReopened(true);
          setOpen((current) => !current);
        }}
      />
      {open && (
        <PagedFeed
          {...feedArgs}
          rows={deepRows}
          opensAtStart={!reopened}
          pageLength={reopened ? 1 : deepRows.length}
          sessionId="deep-restored-feed-test"
        />
      )}
    </>
  );
}

export const RestoresBeyondOneHundredPages: Story = {
  render: () => <DeepReopenedFeed />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(
      () => expect(within(scroll).getByText(deepMessage)).toBeVisible(),
      scrollAwayWait,
    );
    scrollUp(scroll, -1);
    await afterTwoFrames();
    await userEvent.click(
      canvas.getByRole('button', { name: switchSessionLabel }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: switchSessionLabel }),
    );
    const restored = await canvas.findByTestId(feedScrollId);
    await waitFor(
      () => expect(within(restored).getByText(deepMessage)).toBeVisible(),
      { timeout: 20_000 },
    );
  },
};
