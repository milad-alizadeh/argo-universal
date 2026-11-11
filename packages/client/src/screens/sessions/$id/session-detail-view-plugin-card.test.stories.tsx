import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import {
  coverageCard,
  coverageCardSummary,
  issueCardFullView,
  issueCardSummary,
  issueTrackerCard,
  listCard,
  listCardRow,
} from './sections/plugin-card.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  pullRequestMocks,
  withPullRequests,
} from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';

const session = withPullRequests(idleSession, [pullRequestMocks.checksPassed]);

const meta = {
  title: 'Tests/Screens/Sessions/Session/PluginCard',
  parameters: { screenPreview: true },
  args: {
    view: {
      state: 'open',
      ...session,
      pluginCards: [issueTrackerCard, coverageCard],
    },
  },
  render: ({ view }): JSX.Element => <FramedSessionPreview {...view} />,
  beforeEach: (): Promise<void> => settleLayout(1920),
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

const workbenchId = 'desktop-workbench';

// Argo owns the order: its own cards first, then each Plugin's in the order the Slot gives them.
export const CardsFollowArgosInTheWorkbench: Story = {
  play: async ({ canvas }) => {
    const workbench = within(await canvas.findByTestId(workbenchId));
    await expect(workbench.getByText(issueCardSummary)).toBeVisible();
    await expect(workbench.getByText(coverageCardSummary)).toBeVisible();

    const changes = workbench
      .getByTestId('workbench-changes')
      .getBoundingClientRect();

    const issue = workbench
      .getByTestId('workbench-plugin:issue-tracker/issue')
      .getBoundingClientRect();

    const coverage = workbench
      .getByTestId('workbench-plugin:coverage/coverage')
      .getBoundingClientRect();

    await expect(changes.top).toBeLessThan(issue.top);
    await expect(issue.top).toBeLessThan(coverage.top);
  },
};

export const CardOpensItsInspectorTab: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open Issue overview' }),
    );

    const tab = within(await canvas.findByRole('tabpanel', { name: 'Issue' }));
    await expect(tab.getByText(issueCardFullView)).toBeVisible();
  },
};

// A card the Plugin gave no full view stays a card: its body presses nothing.
export const CardWithoutAFullViewOpensNothing: Story = {
  play: async ({ canvas }) => {
    await canvas.findByTestId(workbenchId);
    await expect(
      canvas.queryByRole('button', { name: 'Open Coverage overview' }),
    ).toBeNull();
    await expect(
      canvas.queryByRole('tabpanel', { name: 'Coverage' }),
    ).toBeNull();
  },
};

// A press on the middle of a row that presses nothing is a press on the card's body, so it opens the card's tab.
export const PressingARowInACardOpensItsTab: Story = {
  args: { view: { state: 'open', ...session, pluginCards: [listCard] } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByText(listCardRow));

    const tab = within(await canvas.findByRole('tabpanel', { name: 'Rows' }));
    await expect(tab.getByText(issueCardFullView)).toBeVisible();
  },
};

// A List in a card draws rows on the card, not a card of its own, and ends where its last row does.
export const AListInACardDrawsNoCardOfItsOwn: Story = {
  args: { view: { state: 'open', ...session, pluginCards: [listCard] } },
  play: async ({ canvas }) => {
    const card = await canvas.findByTestId(
      'workbench-plugin:issue-tracker/rows',
    );
    const row = canvas.getByText(listCardRow);

    await waitFor(() =>
      expect(
        card.getBoundingClientRect().bottom -
          row.getBoundingClientRect().bottom,
      ).toBeLessThan(30),
    );
  },
};
