import {
  newSessionCatalogs,
  recordedFeedMocks,
  sessionRows,
} from '@repo/api/mocks';
import type {
  FeedPageInput,
  FeedRowInput,
  FeedSubscribeInput,
} from '@repo/contracts';
import { PortalHost } from '@rn-primitives/portal';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import { createFeedMocks } from '../../mocks/feed-mock';
import { newSessionMocks } from '../../mocks/new-session-mock';
import {
  emptySessionListMocks,
  sessionListMocks,
} from '../../mocks/session-list-mock';
import { createSessionListUpdatesMock } from '../../mocks/session-list-updates-mock';
import { idleSessionMocks } from '../../mocks/session-screen-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { fails, pending } from '../../mocks/trpc-mock-link';
import { DesktopLayout } from '../components/desktop-layout';
import { detailHeaderHost } from '../components/session-header';
import {
  type NavigationDestination,
  NavigationProvider,
} from '../navigation/context';
import { FirstSessionScreen } from './first-session-screen';
import { SessionScreen } from './session-screen';
import { SessionsScreen } from './sessions-screen';

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
      await canvas.findByRole('textbox', { name: 'Message' }),
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
  const feedFor = (sessionId: string) => {
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
  if (!catalog) throw new Error('Recorded catalog needs both Agents.');
  const updates = createSessionListUpdatesMock();
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
      updates.publish({
        type: 'changed',
        session: { ...catalog.second, activityAt: 300 },
      });
      await waitFor(() => {
        const newest = canvas.getByRole('button', {
          name: `${catalog.second.title}, Idle`,
        });
        const previous = canvas.getByRole('button', {
          name: `${catalog.first.title}, Running`,
        });
        expect(newest.getBoundingClientRect().top).toBeLessThan(
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

function FirstSessionBesideList() {
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
  if (!catalog) throw new Error('Recorded catalog needs both Agents.');
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
        canvas.queryByRole('heading', { name: 'What should we work on?' }),
      ).toBeNull();
      await expect(calls).toBe(1);
      await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
      await expect(
        await canvas.findByRole('textbox', { name: 'Message' }),
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
      canvas.queryByRole('heading', { name: 'What should we work on?' }),
    ).toBeNull();
  },
};

function sessionUpdateMocks(
  catalog: (typeof sessionCatalogs)[number],
  updates: ReturnType<typeof createSessionListUpdatesMock>,
) {
  return {
    ...idleSessionMocks,
    ...updates.fixtures,
    'agents.list': () => [catalog.agent],
    'session.list': async (
      input: Parameters<(typeof updates.fixtures)['session.list']>[0],
    ) => {
      const list = await updates.fixtures['session.list'](input);
      return {
        ...list,
        sessions: list.sessions.map((session) => ({
          ...session,
          agent: catalog.agent.agent,
        })),
      };
    },
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
  if (!catalog) throw new Error('Recorded catalog needs both Agents.');
  const updates = createSessionListUpdatesMock();
  return {
    beforeEach: () => {
      updates.reset();
      updates.publish({ type: 'removed', sessionId: catalog.first.sessionId });
      updates.publish({ type: 'removed', sessionId: catalog.second.sessionId });
    },
    parameters: {
      screenPreview: true,
      trpc: { ...newSessionMocks, ...sessionUpdateMocks(catalog, updates) },
    },
    render: () => <NavigatingFirstSession />,
    play: async ({ canvas, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      await expect(
        await canvas.findByRole('heading', { name: 'What should we work on?' }),
      ).toBeVisible();
      await userEvent.type(
        await canvas.findByRole('textbox', { name: 'Message' }),
        'My new Session draft',
      );
      updates.publish({
        type: 'changed',
        session: { ...catalog.first, activityAt: 300 },
      });
      const row = await canvas.findByRole('button', {
        name: `${catalog.first.title}, Running`,
      });
      await expect(row).toBeVisible();
      await expect(
        canvas.getByRole('heading', { name: 'What should we work on?' }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('heading', { name: catalog.first.title }),
      ).toBeNull();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveValue('My new Session draft');
      await userEvent.click(row);
      await expect(
        await canvas.findByRole('heading', { name: catalog.first.title }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('heading', { name: 'What should we work on?' }),
      ).toBeNull();
      await userEvent.click(canvas.getByRole('button', { name: /^Sessions$/ }));
      await expect(
        canvas.queryByRole('heading', { name: 'What should we work on?' }),
      ).toBeNull();
      await expect(
        await canvas.findByRole('textbox', { name: 'Message' }),
      ).toHaveValue('');
    },
  };
}

function NavigatingFirstSession() {
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
