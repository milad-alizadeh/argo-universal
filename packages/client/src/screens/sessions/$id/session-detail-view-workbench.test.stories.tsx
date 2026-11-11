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

const firstChangeLabel = 'Open files of Change #45';

// The Inspector's own glyph label for the same Changes.
const stageLabels = ['Open Change #45', 'Open Change #46'];

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const composerId = 'composer-column';

const workbenchId = 'desktop-workbench';

const detailId = 'desktop-detail';

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

export const CardsStaySeparateAtTheIndependentBoundary = gutterBoundary(1544);

// Below it the page's gutters together no longer hold the cards, so they hide and the conversation stays centred in the page.
export const CardsAutoHideBelowTheIndependentBoundary: Story = {
  beforeEach: (): Promise<void> => settleLayout(1543),
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
    await userEvent.click(
      await canvas.findByRole('button', { name: firstChangeLabel }),
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
    const feed = canvas.getAllByTestId('feed-column').at(-1);

    if (!feed) throw new Error('Recorded Session needs a Feed row');
    await expect(feed.getBoundingClientRect().left).toBe(before.left);
    await expect(feed.getBoundingClientRect().right).toBe(before.right);
    await expect(workbench.getBoundingClientRect().left).toBeGreaterThan(
      before.right,
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Toggle Workbench' }),
    );
    await waitFor(() => expect(workbench).not.toBeVisible());
    await browserUser.hover(composer);
    await expect(composer.getBoundingClientRect().left).toBe(before.left);
    await expect(composer.getBoundingClientRect().right).toBe(before.right);
  },
};

const pageCentre = (canvas: Canvas): number => {
  const page = canvas.getByTestId(detailId).getBoundingClientRect();

  return page.left + page.width / 2;
};

const centreOf = (element: HTMLElement): number => {
  const box = element.getBoundingClientRect();

  return box.left + box.width / 2;
};

// Where the trailing gutter alone does not hold the cards, the conversation moves aside for them and returns to the page's centre when they hide.
export const NarrowGuttersMoveTheConversationAside: Story = {
  beforeEach: (): Promise<void> => settleLayout(1544),
  play: async ({ canvas, userEvent }) => {
    const composer = await canvas.findByTestId(composerId);
    await expectSeparateCards(canvas);
    await waitFor(() =>
      expect(centreOf(composer)).toBeCloseTo(pageCentre(canvas) - 156, 1),
    );
    const feed = canvas.getAllByTestId('feed-column').at(-1);

    if (!feed) throw new Error('Recorded Session needs a Feed row');
    await expect(centreOf(feed)).toBeCloseTo(centreOf(composer), 1);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Toggle Workbench' }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await waitFor(() =>
      expect(centreOf(composer)).toBeCloseTo(pageCentre(canvas), 1),
    );
  },
};

export const SeveralPullRequestsInInspector: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: firstChangeLabel }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }));
    const panel = within(canvas.getByRole('tabpanel', { name: 'Changes' }));

    for (const label of stageLabels) {
      await expect(panel.getByLabelText(label)).toBeVisible();
    }
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

export const SwitchesChangeAndFiles: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(idleSession, [pullRequestMocks.checksPassed]),
    },
  },
  render: ({ view }): JSX.Element => <WithChangedFiles {...view} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: firstChangeLabel }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Files' }));
    await expect(
      canvas.getAllByRole('button', { name: /^Diff for/ }).length,
    ).toBeGreaterThan(0);
    await expect(canvas.queryByRole('button', { name: 'Back' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }));
    await expect(
      canvas.queryByRole('button', { name: /^Diff for/ }),
    ).toBeNull();
  },
};
