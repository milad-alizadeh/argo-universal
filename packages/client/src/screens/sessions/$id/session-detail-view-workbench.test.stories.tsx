import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { fewChanges, useMemoryChanges } from './session-changes.test.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  pullRequestMocks,
  withPullRequests,
} from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/Workbench',
  parameters: { screenPreview: true },
  args: {
    view: {
      state: 'open',
      ...withPullRequests(idleSession, [
        pullRequestMocks.checksRunning,
        { ...pullRequestMocks.checksPassed, number: 46 },
      ]),
    },
  },
  render: ({ view }): JSX.Element => <FramedSessionPreview {...view} />,
  beforeEach: (): Promise<void> => settleLayout(1920),
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

// A pull request's row opens it on GitHub, so the Inspector is opened from the band.
const inspectorToggle = { name: 'Show Inspector' };

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const composerId = 'composer-column';

const workbenchId = 'desktop-workbench';

const detailId = 'desktop-detail';

const toggleWorkbench = 'Toggle Workbench';

function lastFeedRow(canvas: Canvas): HTMLElement {
  const feed = canvas.getAllByTestId('feed-column').at(-1);

  if (!feed) throw new Error('Recorded Session needs a Feed row');

  return feed;
}

async function expectSeparateCards(canvas: Canvas): Promise<void> {
  const composer = canvas.getByTestId(composerId);
  await browserUser.hover(composer);
  await waitFor(async () => {
    await expect(canvas.getByTestId(workbenchId)).toBeVisible();
    const cards = canvas.getByTestId(workbenchId).getBoundingClientRect();

    const content = composer.getBoundingClientRect();
    await expect(content.right).toBeLessThanOrEqual(cards.left);
    await expect(content.width).toBeGreaterThanOrEqual(640);
  });
}

function gutterBoundary(width: number): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(width),
    play: async ({ canvas }) => {
      await canvas.findByTestId(composerId);
      await expectSeparateCards(canvas);
    },
  };
}

export const CardsStaySeparateAtTheIndependentBoundary = gutterBoundary(1604);

// Below it the page's gutters together no longer hold the cards, so they hide and the conversation stays centred in the page.
export const CardsAutoHideBelowTheIndependentBoundary: Story = {
  beforeEach: (): Promise<void> => settleLayout(1603),
  play: async ({ canvas }) => {
    const composer = await canvas.findByTestId(composerId);
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    const page = canvas.getByTestId(detailId).getBoundingClientRect();
    const content = composer.getBoundingClientRect();
    await expect(content.left + content.width / 2).toBeCloseTo(
      page.left + page.width / 2,
      1,
    );
  },
};

export const InspectorAndNavigationKeepCardsOutsideTheConversation: Story = {
  beforeEach: (): Promise<void> => settleLayout(2224),
  play: async ({ canvas, userEvent }) => {
    await expectSeparateCards(canvas);
    await userEvent.click(await canvas.findByRole('button', inspectorToggle));
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: toggleWorkbench }),
    );
    await expectSeparateCards(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Hide sidebar' }));
    await expectSeparateCards(canvas);
    const resize = canvas.getByRole('separator', { name: 'Resize Inspector' });
    resize.focus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await expectSeparateCards(canvas);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Expand Inspector' }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await expect(canvas.getByTestId(detailId)).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Restore Inspector' }),
    );
    await expectSeparateCards(canvas);
  },
};

export const ChecksStayWithTheChangesSummary: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByLabelText('CI Checks 3/5, 2 running'),
    ).toBeVisible();
    await expect(canvas.getByTestId('session-workbench')).toBeVisible();
  },
};

export const WideGuttersKeepTheConversationCentered: Story = {
  beforeEach: (): Promise<void> => settleLayout(2560),
  play: async ({ canvas, userEvent }) => {
    const composer = await canvas.findByTestId(composerId);
    const workbench = canvas.getByTestId(workbenchId);
    await waitFor(() => expect(workbench).toBeVisible());
    await browserUser.hover(composer);
    const before = composer.getBoundingClientRect();
    const frame = canvas.getByTestId('wide-frame').getBoundingClientRect();

    const leading = canvas
      .getByTestId('desktop-detail')
      .getBoundingClientRect().left;

    await expect(before.left + before.width / 2).toBeCloseTo(
      (leading + frame.right) / 2,
      1,
    );
    const feed = lastFeedRow(canvas);
    await expect(feed.getBoundingClientRect().left).toBe(before.left);
    await expect(feed.getBoundingClientRect().right).toBe(before.right);
    await expect(workbench.getBoundingClientRect().left).toBeGreaterThan(
      before.right,
    );
    await userEvent.click(
      canvas.getByRole('button', { name: toggleWorkbench }),
    );
    await waitFor(() => expect(workbench).not.toBeVisible());
    await browserUser.hover(composer);
    await expect(composer.getBoundingClientRect().left).toBe(before.left);
    await expect(composer.getBoundingClientRect().right).toBe(before.right);
  },
};

// On a page too narrow to keep the column centred beside the cards, it moves aside as Codex's thread does: half the card's 312 and the 8 inset.
const asideOfTheCards = 160;

const centreOf = (element: HTMLElement): number => {
  const box = element.getBoundingClientRect();

  return box.left + box.width / 2;
};

const pageCentre = (canvas: Canvas): number =>
  centreOf(canvas.getByTestId(detailId));

// Where the trailing gutter alone does not hold the cards, the conversation centres in the room beside them and returns to the page's centre when they hide.
export const NarrowGuttersCentreTheConversationBesideTheCards: Story = {
  beforeEach: (): Promise<void> => settleLayout(1604),
  play: async ({ canvas, userEvent }) => {
    const composer = await canvas.findByTestId(composerId);
    await expectSeparateCards(canvas);
    await waitFor(() =>
      expect(centreOf(composer)).toBeCloseTo(
        pageCentre(canvas) - asideOfTheCards,
        1,
      ),
    );
    const feed = lastFeedRow(canvas);
    await expect(centreOf(feed)).toBeCloseTo(centreOf(composer), 1);
    await userEvent.click(
      canvas.getByRole('button', { name: toggleWorkbench }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await waitFor(() =>
      expect(centreOf(composer)).toBeCloseTo(pageCentre(canvas), 1),
    );
  },
};

// Below the gutter width the cards hide; the toggle opens them over the page as Codex's popover, the conversation stays centred under them, and a press outside closes them.
export const ShownCardsFloatOverTheCentredConversation: Story = {
  beforeEach: (): Promise<void> => settleLayout(1500),
  play: async ({ canvas, userEvent }) => {
    const composer = await canvas.findByTestId(composerId);
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await waitFor(() =>
      expect(centreOf(composer)).toBeCloseTo(pageCentre(canvas), 1),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: toggleWorkbench }),
    );
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await expect(centreOf(composer)).toBeCloseTo(pageCentre(canvas), 1);
    await expect(centreOf(lastFeedRow(canvas))).toBeCloseTo(
      pageCentre(canvas),
      1,
    );
    await userEvent.click(canvas.getByTestId('workbench-dismiss'));
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
  },
};

// A translucent ancestor stops a glass Surface blurring the page under it, so the cards slide in without fading and nothing above them is translucent.
const frostedInside = (element: HTMLElement): HTMLElement[] =>
  [...element.querySelectorAll<HTMLElement>('*')].filter(
    (node) => getComputedStyle(node).backdropFilter !== 'none',
  );

// Shown and part way through its slide, so the check runs while the cards are coming in.
const sliding = (element: HTMLElement): boolean => {
  const style = getComputedStyle(element);

  return new DOMMatrix(style.transform).m41 > 0 && Number(style.opacity) > 0;
};

function translucentAncestors(element: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];

  for (let node = element.parentElement; node; node = node.parentElement)
    if (Number(getComputedStyle(node).opacity) < 1) found.push(node);

  return found;
}

export const CardsKeepTheirFrostWhileTheySlideIn: Story = {
  beforeEach: (): Promise<void> => settleLayout(1500),
  play: async ({ canvas, userEvent }) => {
    await canvas.findByTestId(composerId);
    await userEvent.click(
      canvas.getByRole('button', { name: toggleWorkbench }),
    );

    const workbench = canvas.getByTestId(workbenchId);
    const frosted = frostedInside(workbench);

    await expect(frosted.length).toBeGreaterThan(0);
    await waitFor(() => expect(sliding(workbench)).toBe(true));

    for (const glass of frosted)
      await expect(translucentAncestors(glass)).toEqual([]);
  },
};

// The Inspector's Changes tab holds the Checkout's files alone: no pull request, and no Change segment.
export const PullRequestsStayOutOfInspector: Story = {
  render: ({ view }): JSX.Element => <WithChangedFiles {...view} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', inspectorToggle));
    const panel = within(canvas.getByRole('tabpanel', { name: 'Changes' }));

    await waitFor(() =>
      expect(
        panel.getAllByRole('button', { name: /^Diff for/ }).length,
      ).toBeGreaterThan(0),
    );
    await expect(panel.queryByRole('button', { name: 'Change' })).toBeNull();
    await expect(panel.queryByRole('button', { name: 'Files' })).toBeNull();
    await expect(panel.queryByLabelText('Open Change #45')).toBeNull();
  },
};

// The Session page with its changed files read from an in-memory Server.
function WithChangedFiles(view: SessionDetailViewProps): JSX.Element {
  const changes = useMemoryChanges(fewChanges);

  return (
    <FramedSessionPreview
      {...(view.state === 'open' ? { ...view, changes } : view)}
    />
  );
}
