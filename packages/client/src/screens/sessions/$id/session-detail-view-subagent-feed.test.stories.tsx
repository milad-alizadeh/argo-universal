import type { Subagent } from '@repo/contracts';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { toFeedView } from '#features/feed';
import { SubagentFeed } from '#features/sessions';
import {
  meta as sessionDetailViewTestMeta,
  type Story,
} from '../../../../mocks/session-view/session-view-story.test.mocks';
import {
  subagentRowsFor,
  subagentSnapshot,
} from '../../../../mocks/subagent-rows.mocks';
import { runningFeed } from '../../../features/sessions/components/subagent-feed/subagent-feed.mocks';
import {
  runningSubagent,
  subagentNow,
  subagentStates,
} from '../../../features/sessions/components/subagent-list/subagent-list.mocks';
import type {
  OpenSessionViewProps,
  SessionDetailViewProps,
} from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { runningSession } from './session-detail-view.mocks';

// The narrowest wide window whose page gutter shows the Workbench's cards.
const workbenchWide = 1856;

const meta = {
  ...sessionDetailViewTestMeta,
  title: 'Tests/Screens/Sessions/Session/SubagentFeed',
  render: ({ view }): JSX.Element => <FramedSessionPreview {...view} />,
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

// A Feed of nothing but the running child's own actions, so its Started row is the row on screen.
function feedOfSubagentRows(subagent: Subagent): OpenSessionViewProps['feed'] {
  const snapshot = { ...subagentSnapshot, subagents: [subagent] };
  const rows = subagentRowsFor(subagent.sessionId, subagent.title);

  return { ...runningSession.feed, items: toFeedView(rows, snapshot).items };
}

// What the connected screen supplies: the child's own Feed, drawn for the Subagent that is open.
const renderSubagentFeed: NonNullable<
  OpenSessionViewProps['renderSubagentFeed']
> = (props) => <SubagentFeed {...props} feed={runningFeed} now={subagentNow} />;

const sessionWithSubagentFeed = (): SessionDetailViewProps => ({
  state: 'open',
  ...runningSession,
  feed: feedOfSubagentRows(runningSubagent),
  renderSubagentFeed,
  subagents: {
    subagents: subagentStates.oneRunning,
    onSelect: fn(),
    now: subagentNow,
  },
});

// The open Subagent's own Feed, once its row has been chosen where the list is drawn.
async function assertFeedShown(
  canvas: PlayContext['canvas'],
  wide: boolean,
): Promise<void> {
  const page = wide ? canvas : within(document.body);

  await expect(
    await page.findByRole('heading', { name: runningSubagent.title }),
  ).toBeVisible();
  await expect(await page.findAllByText(incomingMessage)).not.toHaveLength(0);

  if (wide)
    await expect(
      canvas.getByRole('button', { name: 'Back to Agents' }),
    ).toBeVisible();
}

const incomingMessage = /^Use apply_patch to change beta to gamma/;

// Tapping a Subagent row in the Feed opens where its Subagents list row opens.
function feedRowOpens(width: number): Story {
  return {
    beforeEach: () => settleLayout(width),
    args: { view: sessionWithSubagentFeed() },
    play: async ({ canvas, userEvent }) => {
      const started = await canvas.findByRole('button', {
        name: new RegExp(`^Started ${runningSubagent.title}`),
      });

      await userEvent.click(started);

      await assertOpened(canvas, width === workbenchWide);
      await assertFeedShown(canvas, width === workbenchWide);
    },
  };
}

// Choosing a Subagent in the list opens its Feed, in the Sheet below wide and the Inspector's tab at wide.
function listRowOpensFeed(width: number): Story {
  const wide = width === workbenchWide;

  return {
    beforeEach: () => settleLayout(width),
    args: { view: sessionWithSubagentFeed() },
    play: async ({ canvas, userEvent }) => {
      // Wide, the card's row opens the Feed itself; below wide the Composer's pill opens the Sheet's list.
      if (wide)
        await userEvent.click(
          await canvas.findByRole('button', {
            name: `Open ${runningSubagent.title}`,
          }),
        );
      else {
        await userEvent.click(
          await canvas.findByRole('button', { name: 'Agents: 1' }),
        );
        await userEvent.click(
          await within(document.body).findByRole('link', {
            name: new RegExp(`^${runningSubagent.title},`),
          }),
        );
      }

      await assertFeedShown(canvas, wide);
      await assertOpened(canvas, wide);
    },
  };
}

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

// Wide windows show the list as an Inspector tab (#929); below wide it is a Sheet (#81).
async function assertOpened(
  canvas: PlayContext['canvas'],
  wide: boolean,
): Promise<void> {
  if (wide) {
    const tab = await canvas.findByRole('tab', { name: /^Agents:/ });

    await expect(tab).toHaveAttribute('aria-selected', 'true');

    return;
  }

  const page = within(document.body);

  await waitFor(() =>
    expect(page.getByRole('dialog', { name: 'Agents' })).toBeVisible(),
  );
}

export const WideFeedRowOpensTab = feedRowOpens(workbenchWide);

export const PhoneFeedRowOpensSheet = feedRowOpens(layoutWidths.phone);

export const WideListRowOpensFeed = listRowOpensFeed(workbenchWide);

export const PhoneListRowOpensFeed = listRowOpensFeed(layoutWidths.phone);
