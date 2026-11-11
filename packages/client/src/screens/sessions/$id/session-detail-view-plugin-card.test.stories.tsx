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
  sessionRowBranch,
  sessionRowTitle,
  sessionsCard,
} from './sections/plugin-card.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  pullRequestMocks,
  withPullRequests,
} from './session-detail-view-pull-request.mocks';
import { subagentsSession } from './session-detail-view-subagents.mocks';
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

const cardRadius = 16;

// A surface is anything drawn with a card's corners; the card is the one surface in it.
const surfacesIn = (element: HTMLElement): Element[] =>
  [element, ...element.querySelectorAll('*')].filter(
    (node) =>
      Number.parseFloat(getComputedStyle(node).borderTopLeftRadius) >=
      cardRadius,
  );

// A List in a card draws rows on the card, not a card of its own: the card is the only surface inside its testID.
export const AListInACardDrawsNoCardOfItsOwn: Story = {
  args: { view: { state: 'open', ...session, pluginCards: [listCard] } },
  play: async ({ canvas }) => {
    const card = await canvas.findByTestId(
      'workbench-plugin:issue-tracker/rows',
    );

    await canvas.findByText(listCardRow);
    await expect(surfacesIn(card)).toHaveLength(1);
  },
};

// A Plugin's rows start where the Workbench's own rows do: their tiles share one leading edge, and the text sits no further in than the row's own inset.
export const ARowInACardLinesUpWithTheAgentsRows: Story = {
  args: {
    view: { state: 'open', ...subagentsSession, pluginCards: [listCard] },
  },
  play: async ({ canvas }) => {
    const text = await canvas.findByText(listCardRow);
    const row = text.closest('[role=group]') ?? text;
    const [agent] = await canvas.findAllByRole('button', { name: /^Open / });

    if (!agent) throw new Error('The Agents card needs a row');

    await expect(row.getBoundingClientRect().left).toBe(
      agent.getBoundingClientRect().left,
    );
    await expect(
      text.getBoundingClientRect().left - row.getBoundingClientRect().left,
    ).toBeLessThanOrEqual(20);
  },
};

// A Sessions row draws through FieldLink (a link named by its title and value), and its title and branch never run together.
export const ASessionRowKeepsAGapBeforeItsBranch: Story = {
  args: { view: { state: 'open', ...session, pluginCards: [sessionsCard] } },
  play: async ({ canvas }) => {
    await canvas.findByRole('link', {
      name: `${sessionRowTitle}, ${sessionRowBranch}`,
    });

    const title = canvas.getByText(sessionRowTitle).getBoundingClientRect();
    const branch = canvas.getByText(sessionRowBranch).getBoundingClientRect();

    await expect(branch.left - title.right).toBeGreaterThanOrEqual(12);
  },
};
