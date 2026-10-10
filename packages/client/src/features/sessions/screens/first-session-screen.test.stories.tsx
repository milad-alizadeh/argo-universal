import type {
  FeedPageInput,
  FeedRowInput,
  FeedSubscribeInput,
} from '@repo/contracts';
import {
  newSessionCatalogs,
  recordedFeedMocks,
  sessionRows,
} from '@repo/mocks/app';
import { PortalHost } from '@rn-primitives/portal';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { DesktopLayout } from '#features/frame';
import {
  type NavigationDestination,
  NavigationProvider,
} from '#lib/product/navigation/context';
import { layoutWidths } from '../../../../mocks/each-layout';
import { createFeedMocks } from '../../../../mocks/feed-mock';
import { newSessionMocks } from '../../../../mocks/new-session-mock';
import {
  emptySessionListMocks,
  sessionListMocks,
} from '../../../../mocks/session-list-mock';
import { createSessionListUpdatesMock } from '../../../../mocks/session-list-updates-mock';
import { idleSessionMocks } from '../../../../mocks/session-screen-mock';
import { settleViewport } from '../../../../mocks/settle-viewport';
import { fails, pending } from '../../../../mocks/trpc-mock-link';
import { detailHeaderHost } from '../components/session-header';
import { FirstSessionScreen } from './first-session-screen';
import { SessionScreen } from './session-screen';
import { SessionsScreen } from './sessions-screen';

const missingAgentsFailure = 'Recorded catalog needs both Agents.';
const promptPlaceholder = 'What should we work on?';
const openSessionLabel = 'Open Session';

const meta = {
  title: 'Tests/FirstSessionScreen',
  component: FirstSessionScreen,
  parameters: { trpc: { ...sessionListMocks, ...idleSessionMocks } },
} satisfies Meta<typeof FirstSessionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OpensFirstActiveSession: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('textbox', { name: 'Message' }),
    ).toBeVisible();
    await expect(canvas.getByText('Redraws')).toBeInTheDocument();
  },
};

export const OpensNewSessionWithoutSessions: Story = {
  parameters: { trpc: { ...emptySessionListMocks, ...newSessionMocks } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: openSessionLabel }),
    ).toBeVisible();
  },
};

const sessionCatalogs = newSessionCatalogs.bothAvailable.map((agent, index) => {
  const feed = recordedFeedMocks.find(
    (mock) => mock.agent === `agent-${index + 1}`,
  );
  if (!feed)
    throw new Error(`Recorded catalog needs a Feed for ${agent.label}.`);
  const first = { ...sessionRows.running, agent: agent.agent, activityAt: 200 };
  const second = { ...sessionRows.idle, agent: agent.agent, activityAt: 100 };
  const feedFor = (sessionId: string): ReturnType<typeof createFeedMocks> => {
    const row = sessionId === first.sessionId ? first : second;
    const snapshot = {
      ...feed.snapshot,
      agent: agent.agent,
      configOptions: agent.configOptions,
      title: row.title,
    };
    return createFeedMocks({
      ...feed,
      snapshot,
      stream: [{ type: 'snapshot', snapshot }],
    });
  };
  return { agent, first, second, feedFor };
});

function keepsTheOpenSession(agentIndex: 0 | 1): Story {
  const catalog = sessionCatalogs[agentIndex];
  if (!catalog) throw new Error(missingAgentsFailure);
  const updates = createSessionListUpdatesMock({
    first: { sessions: [catalog.first, catalog.second], nextCursor: null },
  });
  return {
    beforeEach: () => updates.reset(),
    parameters: {
      screenPreview: true,
      trpc: {
        ...sessionUpdateMocks(catalog, updates),
      },
    },
    render: () => <FirstSessionBesideList />,
    play: async ({ canvas, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      await expect(
        await canvas.findByRole('heading', { name: catalog.first.title }),
      ).toBeVisible();
      const message = await canvas.findByRole('textbox', { name: 'Message' });
      await userEvent.type(message, 'A half-typed draft');
      updates.respondWith({
        first: {
          sessions: [{ ...catalog.second, activityAt: 300 }, catalog.first],
          nextCursor: null,
        },
      });
      updates.publish({
        type: 'changed',
        session: { ...catalog.second, activityAt: 300 },
      });
      await waitFor(async () => {
        const newest = canvas.getByRole('button', {
          name: `${catalog.second.title}, Idle`,
        });
        const previous = canvas.getByRole('button', {
          name: `${catalog.first.title}, Running`,
        });
        await expect(newest.getBoundingClientRect().top).toBeLessThan(
          previous.getBoundingClientRect().top,
        );
      });
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveValue('A half-typed draft');
      await expect(
        canvas.getByRole('heading', { name: catalog.first.title }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('heading', { name: catalog.second.title }),
      ).toBeNull();
      updates.respondWith({
        first: { sessions: [catalog.second], nextCursor: null },
      });
      updates.publish({ type: 'removed', sessionId: catalog.first.sessionId });
      await expect(
        await canvas.findByRole('heading', { name: catalog.second.title }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('heading', { name: catalog.first.title }),
      ).toBeNull();
      await expect(
        canvas.queryByRole('button', {
          name: `${catalog.first.title}, Running`,
        }),
      ).toBeNull();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveValue('');
    },
  };
}

function FirstSessionBesideList(): React.JSX.Element {
  return (
    <View className="flex-1 flex-row">
      <View className="w-80">
        <SessionsScreen query="" archived={false} />
      </View>
      <View className="flex-1">
        <PortalHost name={detailHeaderHost} />
        <FirstSessionScreen />
      </View>
    </View>
  );
}

export const KeepsTheOpenSessionFirstAgent = keepsTheOpenSession(0);
export const KeepsTheOpenSessionSecondAgent = keepsTheOpenSession(1);

function listLoadFailure(width: number, agentIndex: 0 | 1): Story {
  const catalog = sessionCatalogs[agentIndex];
  if (!catalog) throw new Error(missingAgentsFailure);
  let calls = 0;
  return {
    beforeEach: () => {
      calls = 0;
    },
    parameters: {
      screenPreview: true,
      trpc: {
        ...newSessionMocks,
        'agents.list': () => [catalog.agent],
        'session.list': async () => {
          calls += 1;
          if (calls === 1) fails('The Server did not respond')();
          return { sessions: [], nextCursor: null };
        },
      },
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const alert = await canvas.findByRole('alert');
      await expect(alert).toHaveTextContent("Couldn't load Sessions");
      await expect(alert).toHaveTextContent(
        "The Server didn't respond. Check that it's running, then retry.",
      );
      await expect(
        canvas.queryByRole('textbox', { name: 'Message' }),
      ).toBeNull();
      await expect(
        canvas.queryByRole('heading', { name: promptPlaceholder }),
      ).toBeNull();
      await expect(calls).toBe(1);
      await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
      await expect(
        await canvas.findByRole('button', { name: openSessionLabel }),
      ).toBeVisible();
      await expect(canvas.queryByRole('alert')).toBeNull();
      await expect(calls).toBe(2);
    },
  };
}
export const ListLoadFailurePhoneFirstAgent = listLoadFailure(
  layoutWidths.phone,
  0,
);
export const ListLoadFailurePhoneSecondAgent = listLoadFailure(
  layoutWidths.phone,
  1,
);
export const ListLoadFailureWideFirstAgent = listLoadFailure(
  layoutWidths.wide,
  0,
);
export const ListLoadFailureWideSecondAgent = listLoadFailure(
  layoutWidths.wide,
  1,
);

export const PendingListStaysBlank: Story = {
  parameters: { trpc: { ...newSessionMocks, 'session.list': pending() } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvas.queryByRole('textbox', { name: 'Message' })).toBeNull();
    await expect(
      canvas.queryByRole('heading', { name: promptPlaceholder }),
    ).toBeNull();
  },
};

function sessionUpdateMocks(
  catalog: (typeof sessionCatalogs)[number],
  updates: ReturnType<typeof createSessionListUpdatesMock>,
): Omit<
  typeof idleSessionMocks,
  keyof typeof updates.fixtures | keyof ReturnType<typeof createFeedMocks>
> &
  typeof updates.fixtures &
  Omit<ReturnType<typeof createFeedMocks>, 'feed.page'> & {
    'agents.list': () => (typeof catalog)['agent'][];
    'feed.page': (
      input: FeedPageInput,
    ) => ReturnType<ReturnType<typeof createFeedMocks>['feed.page']>;
  } {
  return {
    ...idleSessionMocks,
    ...updates.fixtures,
    'agents.list': () => [catalog.agent],
    'feed.page': (input: FeedPageInput) =>
      catalog.feedFor(input.sessionId)['feed.page'](input),
    'feed.row': (input: FeedRowInput) =>
      catalog.feedFor(input.sessionId)['feed.row'](input),
    'feed.subscribe': (input: FeedSubscribeInput) =>
      catalog.feedFor(input.sessionId)['feed.subscribe'](input),
  };
}

function keepsNewSessionUntilLeavingRoot(agentIndex: 0 | 1): Story {
  const catalog = sessionCatalogs[agentIndex];
  if (!catalog) throw new Error(missingAgentsFailure);
  const updates = createSessionListUpdatesMock({
    first: { sessions: [], nextCursor: null },
  });
  return {
    beforeEach: () => {
      updates.reset();
    },
    parameters: {
      screenPreview: true,
      trpc: { ...newSessionMocks, ...sessionUpdateMocks(catalog, updates) },
    },
    render: () => <NavigatingFirstSession />,
    play: async ({ canvas, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      await expect(
        await canvas.findByRole('heading', { name: promptPlaceholder }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('textbox', { name: 'Message' }),
      ).toBeNull();
      updates.respondWith({
        first: {
          sessions: [{ ...catalog.first, activityAt: 300 }],
          nextCursor: null,
        },
      });
      updates.publish({
        type: 'changed',
        session: { ...catalog.first, activityAt: 300 },
      });
      const row = await canvas.findByRole('button', {
        name: `${catalog.first.title}, Running`,
      });
      await expect(row).toBeVisible();
      await expect(
        canvas.getByRole('heading', { name: promptPlaceholder }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('heading', { name: catalog.first.title }),
      ).toBeNull();
      await expect(
        canvas.getByRole('button', { name: openSessionLabel }),
      ).toBeVisible();
      await userEvent.click(row);
      await expect(
        await canvas.findByRole('heading', { name: catalog.first.title }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('heading', { name: promptPlaceholder }),
      ).toBeNull();
      await userEvent.click(canvas.getByRole('button', { name: /^Sessions$/ }));
      await expect(
        canvas.queryByRole('heading', { name: promptPlaceholder }),
      ).toBeNull();
      await expect(
        await canvas.findByRole('textbox', { name: 'Message' }),
      ).toHaveValue('');
    },
  };
}

function NavigatingFirstSession(): React.JSX.Element {
  const [destination, setDestination] = useState<NavigationDestination>({
    to: 'sessions',
  });
  return (
    <NavigationProvider navigate={setDestination}>
      <DesktopLayout destination={destination}>
        {destination.to === 'session' ? (
          <SessionScreen id={destination.id} />
        ) : (
          <FirstSessionScreen />
        )}
      </DesktopLayout>
    </NavigationProvider>
  );
}
export const KeepsNewSessionUntilLeavingRootFirstAgent =
  keepsNewSessionUntilLeavingRoot(0);
export const KeepsNewSessionUntilLeavingRootSecondAgent =
  keepsNewSessionUntilLeavingRoot(1);
