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
  menuRowCard,
  menuRowLabel,
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

const roundedBackground =
  (clear: string) =>
  (node: Element): boolean => {
    const { borderTopLeftRadius, backgroundColor, borderTopWidth } =
      getComputedStyle(node);

    const outlined = Number.parseFloat(borderTopWidth) > 0;

    return (
      Number.parseFloat(borderTopLeftRadius) > 0 &&
      (backgroundColor !== clear || outlined)
    );
  };

// A surface is anything drawn with rounded corners over a background or inside an edge; the card is the one surface in it. The wrapper around the card draws none, so its background is what none looks like.
const surfacesIn = (element: HTMLElement): Element[] =>
  [...element.querySelectorAll('*')].filter(
    roundedBackground(getComputedStyle(element).backgroundColor),
  );

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

// A row's text starts its own inset inside its tile: the tile's 4 and the leading lane's 16.
const rowTextInset = 4 + 16;

// Where the eye cannot tell a pixel apart, two edges are one.
const sameEdge = 1;

// A Plugin's rows start where the Workbench's own rows do: their tiles share one leading edge, and the text sits no further in than the row's own inset.
export const ARowInACardLinesUpWithTheAgentsRows: Story = {
  args: {
    view: { ...subagentsSession, pluginCards: [listCard] },
  },
  play: async ({ canvas }) => {
    const text = await canvas.findByText(listCardRow);
    const row = text.closest('[role=group]') ?? text;
    const [agent] = await canvas.findAllByRole('button', { name: /^Open / });

    if (!agent) throw new Error('The Agents card needs a row');

    await expect(
      Math.abs(
        row.getBoundingClientRect().left - agent.getBoundingClientRect().left,
      ),
    ).toBeLessThanOrEqual(sameEdge);
    await expect(
      text.getBoundingClientRect().left - row.getBoundingClientRect().left,
    ).toBeLessThanOrEqual(rowTextInset + sameEdge);
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

// A row with a menu and no press of its own leaves a click to the card: its centre opens the tab, and right-click still opens the menu.
export const AMenuRowInACardOpensTheTabAndKeepsItsMenu: Story = {
  args: { view: { state: 'open', ...session, pluginCards: [menuRowCard] } },
  play: async ({ canvas, userEvent }) => {
    const row = await canvas.findByText(menuRowLabel);

    await userEvent.pointer({ keys: '[MouseRight]', target: row });

    const item = await within(document.body).findByRole('menuitem', {
      name: 'Archive',
    });

    await waitFor(() => expect(item).toBeVisible());
    await userEvent.keyboard('{Escape}');
    await userEvent.click(row);

    const tab = within(
      await canvas.findByRole('tabpanel', { name: 'Menu rows' }),
    );

    await expect(tab.getByText(issueCardFullView)).toBeVisible();
  },
};
