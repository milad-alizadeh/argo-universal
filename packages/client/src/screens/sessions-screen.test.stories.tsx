import type { SessionListUpdate, SessionCounts } from '@repo/contracts';
import {
  activeSessions,
  agentsList,
  archivedSessions,
  projectsList,
  sessionRows,
} from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { ConnectionStatePreview } from '../../mocks/connection-state-preview';
import { eachLayout, layoutWidths } from '../../mocks/each-layout';
import {
  emptySessionListMocks,
  sessionListMocks,
} from '../../mocks/session-list-mock';
import { createSessionListUpdatesMock } from '../../mocks/session-list-updates-mock';
import {
  largeSessionListMocks,
  multipleProjectsMocks,
  nextPageFailureMocks,
  nextPageLoadingMocks,
  streamingSessionCatalogs,
} from '../../mocks/sessions-list-mock';
import { SessionsScreenPreview } from '../../mocks/sessions-screen-preview';
import { settleViewport } from '../../mocks/settle-viewport';
import type { FixtureOutput } from '../../mocks/trpc-mock-link';
import { fails, pending } from '../../mocks/trpc-mock-link';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import type { ConnectionState } from '../connection/context';
import { DesktopLayout } from './desktop-layout';
import { SessionsScreen } from './sessions-screen';

const settingsPrompt = 'Build the settings screen';
const exampleProjectName = 'Example Project';
const sessionsLoadFailure = "Couldn't load Sessions";
const searchPlaceholder = 'Search Sessions';
const sessionsScrollId = 'sessions-scroll';
const topFadeId = 'scroll-fade-top';
const subscriptionStoppedMessage = 'Live updates stopped';

const recorder = createNavigationRecorder();
const meta = {
  title: 'Tests/SessionsScreen',
  component: SessionsScreen,
  parameters: {
    trpc: sessionListMocks,
    screenPreview: true,
    navigation: recorder,
  },
  args: { query: '', archived: false },
  render: (): React.JSX.Element => <SessionsScreenPreview />,
} satisfies Meta<typeof SessionsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;
type Mode = 'light' | 'dark';

function projectCollapse(width: number, mode: Mode): Story {
  return {
    globals: { mode },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(
        (await canvas.findAllByText(settingsPrompt))[0],
      ).toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: exampleProjectName }),
      );
      await waitFor(() =>
        expect(canvas.queryAllByText(settingsPrompt)).toHaveLength(0),
      );
      const heading = canvas.getByRole('button', {
        name: exampleProjectName,
      });
      await expect(heading).toHaveAttribute('aria-expanded', 'false');
      await userEvent.click(heading);
      await expect(
        (await canvas.findAllByText(settingsPrompt))[0],
      ).toBeVisible();
    },
  };
}
export const ProjectCollapsePhoneLight = projectCollapse(
  layoutWidths.phone,
  'light',
);
export const ProjectCollapsePhoneDark = projectCollapse(
  layoutWidths.phone,
  'dark',
);
export const ProjectCollapseWideLight = projectCollapse(
  layoutWidths.wide,
  'light',
);
export const ProjectCollapseWideDark = projectCollapse(
  layoutWidths.wide,
  'dark',
);
export const Loading: Story = {
  parameters: { trpc: { 'session.list': pending() } },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByRole('status', { name: 'Loading Sessions' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'New Session' }),
      ).toBeEnabled();
      const icons = canvas.getAllByTestId('session-skeleton-icon');
      const titles = canvas.getAllByTestId('session-skeleton-title');
      for (const [index, icon] of icons.entries()) {
        const circle = icon.getBoundingClientRect();
        const line = titles[index]?.getBoundingClientRect();
        if (!line) throw new Error('Missing skeleton title');
        await expect(
          Math.abs(circle.top + circle.height / 2 - line.top - line.height / 2),
        ).toBeLessThan(1);
      }
    }),
};
export const Empty: Story = {
  parameters: { trpc: emptySessionListMocks },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(await canvas.findByText('No Sessions yet.')).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: exampleProjectName }),
      ).toBeVisible();
    }),
};
function errorAndRetry(width: number, mode: Mode): Story {
  return {
    parameters: { trpc: { 'session.list': fails('Server is down') } },
    globals: { mode },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(await canvas.findByText(sessionsLoadFailure)).toBeVisible();
      await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
      await expect(await canvas.findByText(sessionsLoadFailure)).toBeVisible();
    },
  };
}
export const ErrorAndRetryPhoneLight = errorAndRetry(
  layoutWidths.phone,
  'light',
);
export const ErrorAndRetryPhoneDark = errorAndRetry(layoutWidths.phone, 'dark');
export const ErrorAndRetryWideLight = errorAndRetry(layoutWidths.wide, 'light');
export const ErrorAndRetryWideDark = errorAndRetry(layoutWidths.wide, 'dark');
function search(width: number, mode: Mode): Story {
  return {
    globals: { mode },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(canvas.queryByRole('textbox')).toBeNull();
      await userEvent.click(
        canvas.getByRole('button', { name: searchPlaceholder }),
      );
      const input = canvas.getByRole('textbox', { name: searchPlaceholder });
      await waitFor(() => expect(input).toHaveFocus());
      await userEvent.type(input, 'settings');
      await expect(
        (await canvas.findAllByText(settingsPrompt))[0],
      ).toBeVisible();
      await waitFor(() =>
        expect(
          canvas.queryAllByText('Review the proposed change'),
        ).toHaveLength(0),
      );
      await userEvent.clear(input);
      await userEvent.type(input, 'xyz');
      await expect(
        await canvas.findByText('No matching Sessions'),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: exampleProjectName }),
      ).toBeNull();
      await userEvent.keyboard('{Escape}');
      await expect(
        await canvas.findByRole('heading', { name: 'Sessions' }),
      ).toBeVisible();
    },
  };
}
export const SearchPhoneLight = search(layoutWidths.phone, 'light');
export const SearchPhoneDark = search(layoutWidths.phone, 'dark');
export const SearchWideLight = search(layoutWidths.wide, 'light');
export const SearchWideDark = search(layoutWidths.wide, 'dark');
function searchFocusAndReset(width: number, mode: Mode): Story {
  return {
    globals: { mode },
    play: async ({ canvas, userEvent }) => {
      if ('__vitest_browser__' in globalThis) await settleViewport(width);
      await expect(canvas.queryByRole('textbox')).toBeNull();
      await userEvent.click(
        canvas.getByRole('button', { name: searchPlaceholder }),
      );
      await waitFor(() =>
        expect(
          canvas.getByRole('textbox', { name: searchPlaceholder }),
        ).toHaveFocus(),
      );
      await userEvent.type(
        canvas.getByRole('textbox', { name: searchPlaceholder }),
        'settings',
      );
      await userEvent.click(
        canvas.getByRole('button', { name: 'Close search' }),
      );
      await waitFor(() => expect(canvas.queryByRole('textbox')).toBeNull());
      await userEvent.click(
        canvas.getByRole('button', { name: searchPlaceholder }),
      );
      await expect(
        canvas.getByRole('textbox', { name: searchPlaceholder }),
      ).toHaveValue('');
      await waitFor(() =>
        expect(
          canvas.getByRole('textbox', { name: searchPlaceholder }),
        ).toHaveFocus(),
      );
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(canvas.queryByRole('textbox')).toBeNull());
    },
  };
}
export const SearchFocusAndResetPhoneLight = searchFocusAndReset(
  layoutWidths.phone,
  'light',
);
export const SearchFocusAndResetPhoneDark = searchFocusAndReset(
  layoutWidths.phone,
  'dark',
);
export const SearchFocusAndResetWideLight = searchFocusAndReset(
  layoutWidths.wide,
  'light',
);
export const SearchFocusAndResetWideDark = searchFocusAndReset(
  layoutWidths.wide,
  'dark',
);

function archivedFilter(width: number, mode: Mode): Story {
  return {
    globals: { mode },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const archivedTitle = archivedSessions.sessions[0]?.title;
      if (!archivedTitle) throw new Error('Missing archived Session mock');
      await expect(
        (await canvas.findAllByText(settingsPrompt))[0],
      ).toBeVisible();
      await expect(canvas.queryByText(archivedTitle)).toBeNull();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Filter Sessions' }),
      );
      await userEvent.click(
        within(document.body).getByRole('menuitemradio', { name: 'Archived' }),
      );
      await expect(await canvas.findByText(archivedTitle)).toBeVisible();
      await expect(canvas.queryAllByText(settingsPrompt)).toHaveLength(0);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Filter Sessions' }),
      );
      await userEvent.click(
        within(document.body).getByRole('menuitemradio', { name: 'Active' }),
      );
      await expect(
        (await canvas.findAllByText(settingsPrompt))[0],
      ).toBeVisible();
    },
  };
}
export const ArchivedFilterPhoneLight = archivedFilter(
  layoutWidths.phone,
  'light',
);
export const ArchivedFilterPhoneDark = archivedFilter(
  layoutWidths.phone,
  'dark',
);
export const ArchivedFilterWideLight = archivedFilter(
  layoutWidths.wide,
  'light',
);
export const ArchivedFilterWideDark = archivedFilter(layoutWidths.wide, 'dark');
function navigation(width: number, mode: Mode): Story {
  return {
    globals: { mode },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      recorder.reset();
      await userEvent.click(
        canvas.getByRole('button', { name: 'New Session' }),
      );
      await expect(recorder.destinations).toEqual([{ to: 'new-session' }]);
      recorder.reset();
      const row = (
        await canvas.findAllByRole('button', {
          name: 'Build the settings screen, Running',
        })
      )[0];
      if (!row) throw new Error('Missing Session row');
      await userEvent.click(row);
      await expect(recorder.destinations).toEqual([
        { to: 'session', id: 'agent-one:session-running' },
      ]);
      const heading = canvas.getByRole('button', { name: exampleProjectName });
      await userEvent.hover(heading);
      recorder.reset();
      await userEvent.click(
        canvas.getByRole('button', { name: 'New Session in Example Project' }),
      );
      await expect(recorder.destinations).toEqual([
        { to: 'new-session', projectId: projectsList[0]?.id },
      ]);
      await userEvent.hover(heading);
      recorder.reset();
      await userEvent.click(
        canvas.getByRole('button', {
          name: 'Project settings for Example Project',
        }),
      );
      await expect(recorder.destinations).toEqual([
        { to: 'settings-project', name: exampleProjectName },
      ]);
      await expect(heading).toHaveAttribute('aria-expanded', 'true');
    },
  };
}
export const NavigationPhoneLight = navigation(layoutWidths.phone, 'light');
export const NavigationPhoneDark = navigation(layoutWidths.phone, 'dark');
export const NavigationWideLight = navigation(layoutWidths.wide, 'light');
export const NavigationWideDark = navigation(layoutWidths.wide, 'dark');
export const LargeList: Story = {
  parameters: { trpc: largeSessionListMocks },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(await canvas.findByText('Large Session 0')).toBeVisible();
      await expect(canvas.queryByText('Large Session 1999')).toBeNull();
      await expect(
        canvas.getAllByRole('button', { name: /^Large Session \d+, Idle$/ })
          .length,
      ).toBeLessThan(100);
    }),
};
export const MultipleProjects: Story = {
  parameters: { trpc: multipleProjectsMocks },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      const project = await canvas.findByText('Empty Project');
      // The list draws only rows near the view, so bring the Project's rows in.
      project.scrollIntoView();
      await expect(project).toBeVisible();
      await expect(await canvas.findByText('No Sessions yet.')).toBeVisible();
    }),
};

const liveUpdates = createSessionListUpdatesMock();
export const LiveUpdates: Story = {
  beforeEach: () => liveUpdates.reset(),
  parameters: { trpc: liveUpdates.fixtures },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByText('Finished work')).toBeVisible(),
    );
    const updatedSession = {
      ...sessionRows.idle,
      title: 'Newest activity',
      activity: 'Running new work',
      status: 'running' as const,
      activityAt: 300,
    };
    liveUpdates.respondWith({
      first: {
        sessions: [updatedSession, { ...sessionRows.running, activityAt: 200 }],
        nextCursor: null,
      },
    });
    liveUpdates.publish({ type: 'changed', session: updatedSession });
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Newest activity, Running' }),
      ).toBeVisible(),
    );
    await eachLayout(async () =>
      waitFor(async () => {
        const rows = canvas
          .getAllByRole('button')
          .filter((row) =>
            row.getAttribute('aria-label')?.endsWith(', Running'),
          )
          .sort(
            (a, b) =>
              a.getBoundingClientRect().top - b.getBoundingClientRect().top,
          );
        await expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual(
          ['Newest activity, Running', 'Build the settings screen, Running'],
        );
      }),
    );
    liveUpdates.respondWith({
      first: { sessions: [updatedSession], nextCursor: null },
    });
    liveUpdates.publish({
      type: 'removed',
      sessionId: sessionRows.running.sessionId,
    });
    await waitFor(() => expect(canvas.queryByText(settingsPrompt)).toBeNull());
  },
};

export const NextPageFailure: Story = {
  parameters: { trpc: nextPageFailureMocks },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Couldn't load more Sessions"),
    ).toBeVisible();
    await expect(canvas.getByText(settingsPrompt)).toBeVisible();
    await expect(canvas.queryByText(sessionsLoadFailure)).toBeNull();
    await expect(canvas.getAllByRole('button', { name: 'Retry' })).toHaveLength(
      1,
    );
  },
};

export const ScrollFade: Story = {
  play: async ({ canvas }) =>
    eachLayout(async () => {
      const scroll = await canvas.findByTestId(sessionsScrollId);
      scroll.scrollTop = 0;
      await waitFor(() =>
        expect(canvas.getByTestId('scroll-fade-bottom')).toBeVisible(),
      );
      await waitFor(() => expect(canvas.queryByTestId(topFadeId)).toBeNull());
      scroll.scrollTop = 200;
      await waitFor(() => expect(canvas.getByTestId(topFadeId)).toBeVisible());
      scroll.scrollTop = scroll.scrollHeight;
      await waitFor(() =>
        expect(canvas.getByTestId('scroll-fade-bottom')).toBeVisible(),
      );
      scroll.scrollTop = 0;
      await waitFor(() => expect(canvas.queryByTestId(topFadeId)).toBeNull());
    }),
};

export const NextPageLoading: Story = {
  parameters: { trpc: nextPageLoadingMocks },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      const spinner = await canvas.findByRole('progressbar', {
        name: 'Loading more Sessions',
      });
      await expect(spinner).toBeVisible();
      await waitFor(async () => {
        const viewport = canvas
          .getByTestId(sessionsScrollId)
          .getBoundingClientRect();
        const indicator = spinner.getBoundingClientRect();
        await expect(indicator.top).toBeGreaterThanOrEqual(viewport.top);
        await expect(indicator.bottom).toBeLessThanOrEqual(viewport.bottom);
      });
      await expect(canvas.getByText(settingsPrompt)).toBeVisible();
    }),
};

const reconnectCalls = { listUpdates: 0, counts: 0 };
const recoveredTitle = 'Session updated after reconnect';
const reconnectMocks = {
  ...sessionListMocks,
  'session.list': (): FixtureOutput<'session.list'> => ({
    ...activeSessions,
    sessions: activeSessions.sessions.map((session) =>
      session.title === sessionRows.idle.title && reconnectCalls.listUpdates > 1
        ? { ...session, title: recoveredTitle }
        : session,
    ),
  }),
  'session.listUpdates': async function* (): AsyncGenerator<
    Extract<SessionListUpdate, { type: 'changed' }>,
    void
  > {
    reconnectCalls.listUpdates += 1;
    if (reconnectCalls.listUpdates === 1)
      throw new Error(subscriptionStoppedMessage);
    yield {
      type: 'changed' as const,
      session: { ...sessionRows.idle, title: recoveredTitle },
    };
  },
  'session.counts': async function* (): AsyncGenerator<SessionCounts, void> {
    reconnectCalls.counts += 1;
    if (reconnectCalls.counts === 1) throw new Error('Live counts stopped');
    yield { attention: 7, running: 0 };
  },
};
export const ReconnectRestoresLiveSubscriptions: Story = {
  parameters: { trpc: reconnectMocks },
  beforeEach: () => {
    reconnectCalls.listUpdates = 0;
    reconnectCalls.counts = 0;
  },
  render: () => <ReconnectingSessionsScreen />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      (await canvas.findAllByText(sessionRows.idle.title ?? ''))[0],
    ).toBeVisible();
    await waitFor(() =>
      expect(reconnectCalls).toEqual({ listUpdates: 1, counts: 1 }),
    );
    await expect(canvas.queryByText(recoveredTitle)).toBeNull();
    await expect(
      canvas.queryByLabelText('7 Sessions need attention'),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Disconnect fixture' }),
    );
    await expect(
      await canvas.findByText('Reconnecting to the Server…'),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Reconnect fixture' }),
    );
    await waitFor(() =>
      expect(reconnectCalls).toEqual({ listUpdates: 2, counts: 2 }),
    );
    await expect((await canvas.findAllByText(recoveredTitle))[0]).toBeVisible();
    await expect(
      await canvas.findByLabelText('7 Sessions need attention'),
    ).toBeVisible();
    await expect(canvas.queryByText('Reconnecting to the Server…')).toBeNull();
    await expect(reconnectCalls).toEqual({ listUpdates: 2, counts: 2 });
  },
};

function ReconnectingSessionsScreen(): React.JSX.Element {
  const [state, setState] = useState<ConnectionState>('open');
  return (
    <>
      <View>
        <Pressable role="button" onPress={() => setState('reconnecting')}>
          <Text>Disconnect fixture</Text>
        </Pressable>
        <Pressable role="button" onPress={() => setState('open')}>
          <Text>Reconnect fixture</Text>
        </Pressable>
      </View>
      <ConnectionStatePreview state={state}>
        <DesktopLayout destination={{ to: 'sessions' }}>{null}</DesktopLayout>
      </ConnectionStatePreview>
    </>
  );
}

const liveRetryCatalogs = agentsList.map((agent) => {
  const row = activeSessions.sessions.find(
    (session) =>
      session.agent === agent.agent && session.title === sessionRows.idle.title,
  );
  if (!row)
    throw new Error(
      `Recorded catalog needs an idle Session for ${agent.label}.`,
    );
  return { row, updated: { ...row, title: `${row.title} — resumed` } };
});

function liveUpdatesRetry(width: number, agentIndex: 0 | 1): Story {
  const catalog = liveRetryCatalogs[agentIndex];
  if (!catalog) throw new Error('Recorded catalog needs both Agents.');
  let calls = 0;
  const mocks = {
    ...sessionListMocks,
    'session.list': (): Omit<FixtureOutput<'session.list'>, 'nextCursor'> & {
      nextCursor: null;
    } => ({
      sessions: [calls > 1 ? catalog.updated : catalog.row],
      nextCursor: null,
    }),
    'session.listUpdates': async function* (): AsyncGenerator<
      Extract<SessionListUpdate, { type: 'changed' }>,
      void
    > {
      calls += 1;
      if (calls === 1) fails('The live stream ended')();
      yield { type: 'changed' as const, session: catalog.updated };
    },
  };
  return {
    beforeEach: () => {
      calls = 0;
    },
    parameters: { trpc: mocks },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const alert = await canvas.findByRole('alert');
      await expect(alert).toHaveTextContent(subscriptionStoppedMessage);
      await expect(alert).toHaveTextContent(
        'The Sessions shown may be out of date.',
      );
      await expect(canvas.getByText(catalog.row.title)).toBeVisible();
      await expect(canvas.queryByText(sessionsLoadFailure)).toBeNull();
      await expect(calls).toBe(1);
      await userEvent.click(
        within(alert).getByRole('button', { name: 'Retry' }),
      );
      await expect(
        await canvas.findByText(catalog.updated.title),
      ).toBeVisible();
      await expect(canvas.queryByRole('alert')).toBeNull();
      await expect(canvas.queryByText(catalog.row.title)).toBeNull();
      await expect(calls).toBe(2);
    },
  };
}
export const LiveUpdatesRetryPhoneFirstAgent = liveUpdatesRetry(
  layoutWidths.phone,
  0,
);
export const LiveUpdatesRetryPhoneSecondAgent = liveUpdatesRetry(
  layoutWidths.phone,
  1,
);
export const LiveUpdatesRetryWideFirstAgent = liveUpdatesRetry(
  layoutWidths.wide,
  0,
);
export const LiveUpdatesRetryWideSecondAgent = liveUpdatesRetry(
  layoutWidths.wide,
  1,
);

export const OfflineDoesNotShowLiveUpdatesStopped: Story = {
  parameters: {
    connection: 'offline',
    trpc: {
      ...sessionListMocks,
      'session.listUpdates': fails('The live stream ended'),
    },
  },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        (await canvas.findAllByText(sessionRows.idle.title))[0],
      ).toBeVisible();
      await expect(canvas.getByRole('status')).toHaveTextContent(
        'The Server is offline.',
      );
      await expect(canvas.queryByText(subscriptionStoppedMessage)).toBeNull();
      await expect(canvas.queryByRole('alert')).toBeNull();
    }),
};

function burstRefetch(width: number, agentIndex: 0 | 1): Story {
  const catalog = streamingSessionCatalogs[agentIndex];
  if (!catalog) throw new Error('Recorded catalog needs both Agents.');
  const updates = createSessionListUpdatesMock({
    first: { sessions: [catalog.row], nextCursor: null },
  });
  const newestTitle = `${catalog.row.title} — update 30`;
  return {
    parameters: { trpc: updates.fixtures },
    beforeEach: () => {
      updates.reset();
      return () => updates.reset();
    },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(await canvas.findByText(catalog.row.title)).toBeVisible();
      await waitFor(() => expect(updates.calls.active).toBe(0));
      const before = updates.calls.list;
      updates.hold();
      updates.respondWith({
        first: {
          sessions: [
            {
              ...catalog.row,
              title: newestTitle,
              activityAt: catalog.row.activityAt + 30,
            },
          ],
          nextCursor: null,
        },
      });
      for (let index = 1; index <= 30; index++)
        updates.publish({
          type: 'changed',
          session: {
            ...catalog.row,
            title: `${catalog.row.title} — update ${index}`,
            activityAt: catalog.row.activityAt + index,
          },
        });
      await waitFor(() => expect(updates.calls.delivered).toBe(30));
      await expect(updates.calls.list - before).toBeLessThanOrEqual(2);
      updates.release();
      await expect(await canvas.findByText(newestTitle)).toBeVisible();
      await waitFor(() => expect(updates.calls.active).toBe(0));
      await expect(updates.calls.list - before).toBeGreaterThan(0);
      await expect(updates.calls.list - before).toBeLessThanOrEqual(2);
      await expect(canvas.queryByText(catalog.row.title)).toBeNull();
      await expect(
        canvas.queryByText(`${catalog.row.title} — update 1`),
      ).toBeNull();
    },
  };
}
export const BurstRefetchPhoneFirstAgent = burstRefetch(layoutWidths.phone, 0);
export const BurstRefetchPhoneSecondAgent = burstRefetch(layoutWidths.phone, 1);
export const BurstRefetchWideFirstAgent = burstRefetch(layoutWidths.wide, 0);
export const BurstRefetchWideSecondAgent = burstRefetch(layoutWidths.wide, 1);

function streamingPagination(width: number, agentIndex: 0 | 1): Story {
  const catalog = streamingSessionCatalogs[agentIndex];
  const first = catalog?.pages[0];
  const last = catalog?.pages.at(-1);
  if (!catalog || !first || !last)
    throw new Error('Recorded catalog needs two pages for both Agents.');
  const initialPages = {
    first: { sessions: catalog.pages.slice(0, 50), nextCursor: '50' },
    '50': { sessions: catalog.pages.slice(50), nextCursor: null },
  };
  const updates = createSessionListUpdatesMock(initialPages);
  const newestTitle = `${first.title} — streaming`;
  return {
    parameters: { trpc: updates.fixtures },
    beforeEach: () => {
      updates.reset();
      return () => updates.reset();
    },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(await canvas.findByText(first.title)).toBeVisible();
      await waitFor(() => expect(updates.calls.active).toBe(0));
      await expect(updates.calls.nextPage).toBe(0);
      await expect(canvas.queryByText(last.title)).toBeNull();
      updates.hold();
      updates.respondWith({
        ...initialPages,
        first: {
          sessions: [
            { ...first, status: 'running', activity: 'Streaming work' },
            ...catalog.pages.slice(1, 50),
          ],
          nextCursor: '50',
        },
      });
      updates.publish({
        type: 'changed',
        session: { ...first, status: 'running', activity: 'Streaming work' },
      });
      await waitFor(() => expect(updates.calls.delivered).toBe(1));
      await waitFor(() => expect(updates.calls.active).toBe(1));
      const scroll = canvas.getByTestId(sessionsScrollId);
      scroll.scrollTop = scroll.scrollHeight;
      await waitFor(() => expect(updates.calls.nextPage).toBeGreaterThan(0));
      const spinner = await canvas.findByRole('progressbar', {
        name: 'Loading more Sessions',
      });
      await expect(spinner).toBeVisible();
      await waitFor(async () => {
        scroll.scrollTop = scroll.scrollHeight;
        const viewport = scroll.getBoundingClientRect();
        const indicator = spinner.getBoundingClientRect();
        await expect(indicator.top).toBeGreaterThanOrEqual(viewport.top);
        await expect(indicator.bottom).toBeLessThanOrEqual(viewport.bottom);
      });
      updates.respondWith({
        ...initialPages,
        first: {
          sessions: [
            {
              ...first,
              status: 'running',
              title: newestTitle,
              activity: 'Still streaming work',
            },
            ...catalog.pages.slice(1, 50),
          ],
          nextCursor: '50',
        },
      });
      updates.publish({
        type: 'changed',
        session: {
          ...first,
          status: 'running',
          title: newestTitle,
          activity: 'Still streaming work',
        },
      });
      await waitFor(() => expect(updates.calls.delivered).toBe(2));
      updates.release();
      await waitFor(async () => {
        scroll.scrollTop = scroll.scrollHeight;
        await expect(canvas.getByText(last.title)).toBeVisible();
      });
      await waitFor(() => expect(updates.calls.active).toBe(0));
      await expect(canvas.queryByRole('progressbar')).toBeNull();
      scroll.scrollTop = 0;
      await expect(await canvas.findByText(newestTitle)).toBeVisible();
      await expect(canvas.queryByText(first.title)).toBeNull();
      await expect(canvas.queryByRole('alert')).toBeNull();
    },
  };
}
export const StreamingPaginationPhoneFirstAgent = streamingPagination(
  layoutWidths.phone,
  0,
);
export const StreamingPaginationPhoneSecondAgent = streamingPagination(
  layoutWidths.phone,
  1,
);
export const StreamingPaginationWideFirstAgent = streamingPagination(
  layoutWidths.wide,
  0,
);
export const StreamingPaginationWideSecondAgent = streamingPagination(
  layoutWidths.wide,
  1,
);
