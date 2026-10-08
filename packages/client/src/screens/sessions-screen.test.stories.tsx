import {
  activeSessions,
  agentsList,
  archivedSessions,
  projectsList,
  sessionRows,
} from '@repo/api/mocks';
import type { SessionListUpdate, SessionCounts } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useEffect } from 'react';
import { expect, waitFor, within } from 'storybook/test';
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
import { DesktopLayout } from '../components/desktop-layout';
import { useConnection } from '../connection/context';
import type { ConnectionActor } from '../connection/open-connection';
import { SessionsScreen } from './sessions-screen';

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
        (await canvas.findAllByText('Build the settings screen'))[0],
      ).toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Example Project' }),
      );
      await waitFor(() =>
        expect(canvas.queryAllByText('Build the settings screen')).toHaveLength(
          0,
        ),
      );
      const heading = canvas.getByRole('button', {
        name: 'Example Project',
      });
      await expect(heading).toHaveAttribute('aria-expanded', 'false');
      await userEvent.click(heading);
      await expect(
        (await canvas.findAllByText('Build the settings screen'))[0],
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
        canvas.getByRole('button', { name: 'Example Project' }),
      ).toBeVisible();
    }),
};
function errorAndRetry(width: number, mode: Mode): Story {
  return {
    parameters: { trpc: { 'session.list': fails('Server is down') } },
    globals: { mode },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(
        await canvas.findByText("Couldn't load Sessions"),
      ).toBeVisible();
      await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
      await expect(
        await canvas.findByText("Couldn't load Sessions"),
      ).toBeVisible();
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
        canvas.getByRole('button', { name: 'Search Sessions' }),
      );
      const input = canvas.getByRole('textbox', { name: 'Search Sessions' });
      await waitFor(() => expect(input).toHaveFocus());
      await userEvent.type(input, 'settings');
      await expect(
        (await canvas.findAllByText('Build the settings screen'))[0],
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
        canvas.queryByRole('button', { name: 'Example Project' }),
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
function searchMorph(width: number, mode: Mode): Story {
  return {
    globals: { mode },
    play: async ({ canvas, userEvent }) => {
      if ('__vitest_browser__' in globalThis) await settleViewport(width);
      const surface = canvas.getByTestId('list-search-surface');
      const measureTransition = async (
        button: HTMLElement,
      ): Promise<number[]> => {
        const samples = new Promise<number[]>((resolve) => {
          button.addEventListener(
            'click',
            () => {
              const widths: number[] = [];
              const started = performance.now();
              function measure(): void {
                widths.push(surface.getBoundingClientRect().width);
                if (performance.now() - started < 400)
                  requestAnimationFrame(measure);
                else resolve(widths);
              }
              requestAnimationFrame(measure);
            },
            { once: true },
          );
        });
        await userEvent.click(button);
        return samples;
      };
      await expect(canvas.queryByRole('textbox')).toBeNull();
      await waitFor(() =>
        expect(surface.getBoundingClientRect().width).toBeCloseTo(
          canvas
            .getByRole('button', { name: 'Search Sessions' })
            .getBoundingClientRect().width,
          0,
        ),
      );
      const collapsedWidth = surface.getBoundingClientRect().width;
      // One plain open and close. Closing with a query clears the list filter, and that render can swallow the whole animation, so the query is checked below.
      const openingWidths = await measureTransition(
        canvas.getByRole('button', { name: 'Search Sessions' }),
      );
      await waitFor(() =>
        expect(
          canvas.getByRole('textbox', { name: 'Search Sessions' }),
        ).toHaveFocus(),
      );
      const expandedWidth = surface.getBoundingClientRect().width;
      await expect(expandedWidth).toBeGreaterThan(collapsedWidth * 3);
      const closingWidths = await measureTransition(
        canvas.getByRole('button', { name: 'Close search' }),
      );
      await waitFor(() => expect(canvas.queryByRole('textbox')).toBeNull());
      await waitFor(() =>
        expect(surface.getBoundingClientRect().width).toBeCloseTo(
          collapsedWidth,
          0,
        ),
      );
      const isBetween = (width: number): boolean =>
        width > collapsedWidth + 1 && width < expandedWidth - 1;
      await expect(openingWidths.some(isBetween)).toBe(true);
      await expect(closingWidths.some(isBetween)).toBe(true);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Search Sessions' }),
      );
      await userEvent.type(
        canvas.getByRole('textbox', { name: 'Search Sessions' }),
        'settings',
      );
      await userEvent.click(
        canvas.getByRole('button', { name: 'Close search' }),
      );
      await waitFor(() => expect(canvas.queryByRole('textbox')).toBeNull());
      await userEvent.click(
        canvas.getByRole('button', { name: 'Search Sessions' }),
      );
      await expect(
        canvas.getByRole('textbox', { name: 'Search Sessions' }),
      ).toHaveValue('');
      await waitFor(() =>
        expect(
          canvas.getByRole('textbox', { name: 'Search Sessions' }),
        ).toHaveFocus(),
      );
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(getComputedStyle(surface).opacity).toBe('0'));
    },
  };
}
export const SearchMorphPhoneLight = searchMorph(layoutWidths.phone, 'light');
export const SearchMorphPhoneDark = searchMorph(layoutWidths.phone, 'dark');
export const SearchMorphWideLight = searchMorph(layoutWidths.wide, 'light');
export const SearchMorphWideDark = searchMorph(layoutWidths.wide, 'dark');

function archivedFilter(width: number, mode: Mode): Story {
  return {
    globals: { mode },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const archivedTitle = archivedSessions.sessions[0]?.title;
      if (!archivedTitle) throw new Error('Missing archived Session mock');
      await expect(
        (await canvas.findAllByText('Build the settings screen'))[0],
      ).toBeVisible();
      await expect(canvas.queryByText(archivedTitle)).toBeNull();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Filter Sessions' }),
      );
      await userEvent.click(
        within(document.body).getByRole('menuitemradio', { name: 'Archived' }),
      );
      await expect(await canvas.findByText(archivedTitle)).toBeVisible();
      await expect(
        canvas.queryAllByText('Build the settings screen'),
      ).toHaveLength(0);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Filter Sessions' }),
      );
      await userEvent.click(
        within(document.body).getByRole('menuitemradio', { name: 'Active' }),
      );
      await expect(
        (await canvas.findAllByText('Build the settings screen'))[0],
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
      const heading = canvas.getByRole('button', { name: 'Example Project' });
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
        { to: 'settings-project', name: 'Example Project' },
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
  play: async ({ canvas, canvasElement }) =>
    eachLayout(async () => {
      await expect(await canvas.findByText('Large Session 0')).toBeVisible();
      await expect(canvas.queryByText('Large Session 1999')).toBeNull();
      await expect(
        canvasElement.querySelectorAll('[data-testid="session-logo"]').length,
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
    liveUpdates.publish({
      type: 'changed',
      session: {
        ...sessionRows.idle,
        title: 'Newest activity',
        activity: 'Running new work',
        status: 'running',
        activityAt: 300,
      },
    });
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
    liveUpdates.publish({
      type: 'removed',
      sessionId: sessionRows.running.sessionId,
    });
    await waitFor(() =>
      expect(canvas.queryByText('Build the settings screen')).toBeNull(),
    );
  },
};

export const NextPageFailure: Story = {
  parameters: { trpc: nextPageFailureMocks },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Couldn't load more Sessions"),
    ).toBeVisible();
    await expect(canvas.getByText('Build the settings screen')).toBeVisible();
    await expect(canvas.queryByText("Couldn't load Sessions")).toBeNull();
    await expect(canvas.getAllByRole('button', { name: 'Retry' })).toHaveLength(
      1,
    );
  },
};

export const ScrollFade: Story = {
  play: async ({ canvas }) =>
    eachLayout(async () => {
      const scroll = await canvas.findByTestId('sessions-scroll');
      scroll.scrollTop = 0;
      await waitFor(() =>
        expect(canvas.getByTestId('scroll-fade-bottom')).toBeVisible(),
      );
      await waitFor(() =>
        expect(canvas.queryByTestId('scroll-fade-top')).toBeNull(),
      );
      scroll.scrollTop = 200;
      await waitFor(() =>
        expect(canvas.getByTestId('scroll-fade-top')).toBeVisible(),
      );
      scroll.scrollTop = scroll.scrollHeight;
      await waitFor(() =>
        expect(canvas.getByTestId('scroll-fade-bottom')).toBeVisible(),
      );
      scroll.scrollTop = 0;
      await waitFor(() =>
        expect(canvas.queryByTestId('scroll-fade-top')).toBeNull(),
      );
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
          .getByTestId('sessions-scroll')
          .getBoundingClientRect();
        const indicator = spinner.getBoundingClientRect();
        await expect(indicator.top).toBeGreaterThanOrEqual(viewport.top);
        await expect(indicator.bottom).toBeLessThanOrEqual(viewport.bottom);
      });
      await expect(canvas.getByText('Build the settings screen')).toBeVisible();
    }),
};

let reconnectConnection: ConnectionActor | undefined;
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
      throw new Error('Live updates stopped');
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
    reconnectConnection = undefined;
    reconnectCalls.listUpdates = 0;
    reconnectCalls.counts = 0;
  },
  render: () => <ReconnectingSessionsScreen />,
  play: async ({ canvas }) => {
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
    if (!reconnectConnection)
      throw new Error('Connection mock was not mounted');
    reconnectConnection.send({
      type: 'connection.lost',
      error: new Error('Socket closed'),
    });
    await expect(
      await canvas.findByText('Reconnecting to the Server…'),
    ).toBeVisible();
    reconnectConnection.send({ type: 'connection.opened' });
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
  const connection = useConnection();
  useEffect(() => {
    reconnectConnection = connection;
  }, [connection]);
  return <DesktopLayout destination={{ to: 'sessions' }}>{null}</DesktopLayout>;
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
      await expect(alert).toHaveTextContent('Live updates stopped');
      await expect(alert).toHaveTextContent(
        'The Sessions shown may be out of date.',
      );
      await expect(canvas.getByText(catalog.row.title)).toBeVisible();
      await expect(canvas.queryByText("Couldn't load Sessions")).toBeNull();
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
      await expect(canvas.queryByText('Live updates stopped')).toBeNull();
      await expect(canvas.queryByRole('alert')).toBeNull();
    }),
};

function burstRefetch(width: number, agentIndex: 0 | 1): Story {
  const catalog = streamingSessionCatalogs[agentIndex];
  if (!catalog) throw new Error('Recorded catalog needs both Agents.');
  const updates = createSessionListUpdatesMock({ sessions: [catalog.row] });
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
  const updates = createSessionListUpdatesMock({ sessions: catalog.pages });
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
      updates.publish({
        type: 'changed',
        session: { ...first, status: 'running', activity: 'Streaming work' },
      });
      await waitFor(() => expect(updates.calls.delivered).toBe(1));
      await waitFor(() => expect(updates.calls.active).toBe(1));
      const scroll = canvas.getByTestId('sessions-scroll');
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
