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

export const CardsStaySeparateAtTheIndependentBoundary = gutterBoundary(1544);

// Below it the page's gutters together no longer hold the cards, so they hide.
export const CardsAutoHideBelowTheIndependentBoundary: Story = {
  beforeEach: (): Promise<void> => settleLayout(1543),
  play: async ({ canvas }) => {
    await canvas.findByTestId(composerId);
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
  },
};

export const InspectorAndNavigationKeepCardsOutsideTheConversation: Story = {
  beforeEach: (): Promise<void> => settleLayout(2224),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', inspectorToggle));
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

// In wide gutters the cards sit clear of the conversation, which keeps its place when they hide.
export const WideGuttersKeepTheConversationInPlace: Story = {
  beforeEach: (): Promise<void> => settleLayout(2560),
  play: async ({ canvas, userEvent }) => {
    const composer = await canvas.findByTestId(composerId);
    const workbench = canvas.getByTestId(workbenchId);
    await waitFor(() => expect(workbench).toBeVisible());
    await browserUser.hover(composer);
    const before = composer.getBoundingClientRect();
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

// Below the gutter width the cards hide; pressing Show draws them over the page, and the conversation moves clear of them rather than running under.
export const ShownCardsCoverNoText: Story = {
  beforeEach: (): Promise<void> => settleLayout(1500),
  play: async ({ canvas, userEvent }) => {
    const composer = await canvas.findByTestId(composerId);
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: toggleWorkbench }),
    );
    await expectSeparateCards(canvas);
    const feed = lastFeedRow(canvas);
    await expect(feed.getBoundingClientRect().right).toBeLessThanOrEqual(
      canvas.getByTestId(workbenchId).getBoundingClientRect().left,
    );
    await browserUser.hover(composer);
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
