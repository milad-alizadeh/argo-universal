import type { Subagent } from '@repo/contracts';
import type { Meta } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { toFeedView } from '#features/feed';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import {
  meta as sessionDetailViewTestMeta,
  type Story,
} from '../../../../mocks/session-view/session-view-story.test.mocks';
import {
  subagentRowsFor,
  subagentSnapshot,
} from '../../../../mocks/subagent-rows.mocks';
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

const meta = {
  ...sessionDetailViewTestMeta,
  title: 'Tests/SessionDetailViewSubagentFeed',
  render: ({ view }): JSX.Element => <FramedSessionPreview {...view} />,
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

// A Feed of nothing but the running child's own actions, so its Started row is the row on screen.
function feedOfSubagentRows(subagent: Subagent): OpenSessionViewProps['feed'] {
  const snapshot = { ...subagentSnapshot, subagents: [subagent] };
  const rows = subagentRowsFor(subagent.sessionId, subagent.title);

  return { ...runningSession.feed, items: toFeedView(rows, snapshot).items };
}

const sessionWithSubagentFeed = (): SessionDetailViewProps => ({
  state: 'open',
  ...runningSession,
  feed: feedOfSubagentRows(runningSubagent),
  subagents: {
    subagents: subagentStates.oneRunning,
    onSelect: fn(),
    now: subagentNow,
  },
});

// Tapping a Subagent row in the Feed opens where its Subagents list row opens.
function feedRowOpens(width: number): Story {
  return {
    beforeEach: () => settleViewport(width),
    args: { view: sessionWithSubagentFeed() },
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(
        await canvas.findByRole('button', {
          name: new RegExp(`^Started ${runningSubagent.title}`),
        }),
      );

      await assertOpened(canvas, width === layoutWidths.wide);
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
    const tab = await canvas.findByRole('tab', { name: /^Subagents:/ });

    await expect(tab).toHaveAttribute('aria-selected', 'true');

    return;
  }

  const page = within(document.body);

  await waitFor(() =>
    expect(page.getByRole('dialog', { name: 'Subagents' })).toBeVisible(),
  );
}

export const WideFeedRowOpensTab = feedRowOpens(layoutWidths.wide);

export const PhoneFeedRowOpensSheet = feedRowOpens(layoutWidths.phone);
