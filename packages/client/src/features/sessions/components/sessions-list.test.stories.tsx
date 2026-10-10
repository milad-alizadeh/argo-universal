import { sessionRows } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { expect, fn, waitFor } from 'storybook/test';
import { createSessionListUpdatesMock } from '../../../../mocks/session-list-updates-mock';
import {
  sessionsListProps,
  largeSessions,
} from '../../../../mocks/sessions-list-mock';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { SessionsScreen } from '../screens/sessions-screen';
import {
  delayFooterLayout,
  getDelayedFooterLayouts,
  installFooterLayoutDelay,
} from './delayed-footer-layout.mocks';
import { SessionsList } from './sessions-list';
import { renderingSessions } from './sessions-rendering.mocks';

const exampleProjectName = 'Example Project';
const expandedAttribute = 'aria-expanded';

const onNewSession = fn();
const onProjectSettings = fn();
const unchangedSessionLabel = 'Unchanged Session, Idle';
const selectableSessionId = 'memo-selectable';

const meta = {
  title: 'Tests/SessionsList',
  component: SessionsList,
  args: {
    ...sessionsListProps,
    onSelect: fn(),
    onEndReached: fn(),
    onNewSession,
    onProjectSettings,
  },
  render: (args): React.JSX.Element => (
    <View className="w-full wide:w-shell-list" style={{ height: 320 }}>
      <SessionsList {...args} />
    </View>
  ),
  beforeEach: (): (() => void) => {
    const restoreResizeObserver = installFooterLayoutDelay();
    onNewSession.mockClear();
    onProjectSettings.mockClear();
    return restoreResizeObserver;
  },
} satisfies Meta<typeof SessionsList>;
export default meta;
type Story = StoryObj<typeof meta>;

const insertion = createSessionListUpdatesMock({
  first: { sessions: largeSessions.slice(0, 12), nextCursor: null },
});
const pagination = createSessionListUpdatesMock({
  first: { sessions: largeSessions.slice(0, 20), nextCursor: '20' },
  '20': { sessions: largeSessions.slice(20, 40), nextCursor: '40' },
  '40': { sessions: largeSessions.slice(40, 60), nextCursor: '60' },
  '60': { sessions: largeSessions.slice(60, 80), nextCursor: '80' },
  '80': { sessions: largeSessions.slice(80, 100), nextCursor: null },
});

export const MemoizedRows: Story = {
  name: 'Controlled selection and activity',
  render: () => <View testID="controlled-list" />,
  play: async ({ canvas, userEvent, args }) => {
    const root = createRoot(canvas.getByTestId('controlled-list'));
    const render = (props: React.ComponentProps<typeof SessionsList>): void =>
      root.render(
        <SafeAreaProvider>
          <View style={{ height: 360 }}>
            <SessionsList {...props} />
          </View>
        </SafeAreaProvider>,
      );
    const props = { ...args, sessions: renderingSessions };
    try {
      render(props);
      const unchanged = await canvas.findByRole('button', {
        name: unchangedSessionLabel,
      });
      const selectable = canvas.getByRole('button', {
        name: 'Selectable Session, Idle',
      });
      await userEvent.click(selectable);
      await expect(args.onSelect).toHaveBeenCalledWith(selectableSessionId);
      render({ ...props, selectedSessionId: selectableSessionId });
      await waitFor(() =>
        expect(selectable).toHaveAttribute('aria-selected', 'true'),
      );
      await expect(
        canvas.getByRole('button', { name: unchangedSessionLabel }),
      ).toBe(unchanged);
      render({
        ...props,
        selectedSessionId: selectableSessionId,
        sessions: renderingSessions.map((session) =>
          session.sessionId === 'memo-updated'
            ? { ...session, activity: 'Session activity updated' }
            : session,
        ),
      });
      await canvas.findByText('Session activity updated');
      await expect(
        canvas.getByRole('button', { name: unchangedSessionLabel }),
      ).toBe(unchanged);
    } finally {
      root.unmount();
    }
  },
};

export const ProjectActions: Story = {
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('button', {
      name: exampleProjectName,
    });
    await waitFor(() => expect(heading).toBeVisible());
    await userEvent.hover(heading);
    const settings = canvas.getByRole('button', {
      name: 'Project settings for Example Project',
    });
    const newSession = canvas.getByRole('button', {
      name: 'New Session in Example Project',
    });
    await expect(settings).toBeVisible();
    await expect(newSession).toBeVisible();
    await userEvent.click(settings);
    await expect(onProjectSettings).toHaveBeenCalledWith(exampleProjectName);
    await userEvent.click(newSession);
    await expect(onNewSession).toHaveBeenCalledWith(
      sessionsListProps.projects[0]?.id,
    );
    await expect(heading).toHaveAttribute(expandedAttribute, 'true');
    await userEvent.click(heading);
    await expect(heading).toHaveAttribute(expandedAttribute, 'false');
    await expect(heading).toHaveAccessibleName('Example Project');
    await userEvent.hover(heading);
    await userEvent.click(newSession);
    await expect(heading).toHaveAttribute(expandedAttribute, 'false');
  },
};
export const ProjectActionsDark: Story = {
  ...ProjectActions,
  globals: { mode: 'dark' },
};

export const InsertSessionWithoutOverlap: Story = {
  parameters: { screenPreview: true, trpc: insertion.fixtures },
  beforeEach: () => insertion.reset(),
  render: () => <SessionsScreen query="" archived={false} />,
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('button', {
      name: exampleProjectName,
    });
    const existing = canvas.getByRole('button', {
      name: 'Large Session 0, Idle',
    });
    await userEvent.hover(heading);
    await waitFor(async () => {
      const firstRow = existing.getBoundingClientRect();
      const project = heading.getBoundingClientRect();
      await expect(Math.abs(firstRow.top - project.bottom)).toBeLessThanOrEqual(
        3,
      );
    });
    const initialTop = existing.getBoundingClientRect().top;
    const positions = [initialTop];
    const movement = new Promise<void>((resolve) => {
      const started = performance.now();
      function sample(): void {
        positions.push(existing.getBoundingClientRect().top);
        if (performance.now() - started < 600) requestAnimationFrame(sample);
        else resolve();
      }
      requestAnimationFrame(sample);
    });
    const newSession = {
      ...sessionRows.idle,
      sessionId: 'new-session-1',
      title: 'New Session 1',
      activity: 'Session created',
      activityAt: 3000,
    };
    insertion.respondWith({
      first: {
        sessions: [newSession, ...largeSessions.slice(0, 12)],
        nextCursor: null,
      },
    });
    insertion.publish({ type: 'changed', session: newSession });
    const inserted = await canvas.findByRole('button', {
      name: 'New Session 1, Idle',
    });
    await waitFor(async () => {
      const newRectangle = inserted.getBoundingClientRect();
      const oldRectangle = existing.getBoundingClientRect();
      await expect(newRectangle.bottom).toBeLessThanOrEqual(
        oldRectangle.top + 1,
      );
    });
    await movement;
    const finalTop = existing.getBoundingClientRect().top;
    await expect(finalTop - initialTop).toBeGreaterThan(0);
    await expect(
      positions.some((top) => top > initialTop + 1 && top < finalTop - 1),
      'Existing rows must pass through intermediate positions, not jump',
    ).toBe(true);
    await userEvent.hover(inserted);
  },
};
export const InsertSessionWithoutOverlapDark: Story = {
  ...InsertSessionWithoutOverlap,
  globals: { mode: 'dark' },
};

export const FirstAndLastRowsReachable: Story = {
  parameters: { screenPreview: true },
  render: (args) => (
    <View className="flex-1 w-full wide:w-shell-list" style={{ minHeight: 0 }}>
      <SessionsList {...args} sessions={largeSessions.slice(0, 12)} />
    </View>
  ),
  play: async ({ canvas }) => {
    // At a phone's size twelve Sessions overflow the list, so it can scroll.
    if ('__vitest_browser__' in globalThis) await settleViewport(390);
    const scroll = canvas.getByTestId('sessions-scroll');
    const heading = await canvas.findByRole('button', {
      name: exampleProjectName,
    });
    await waitFor(async () => {
      await expect(
        heading.getBoundingClientRect().top -
          scroll.getBoundingClientRect().top,
      ).toBeGreaterThanOrEqual(0);
    });
    // Until the rows measure, the list is not yet tall enough to scroll.
    await waitFor(async () => {
      scroll.scrollTop = 40;
      await expect(scroll.scrollTop).toBeGreaterThan(0);
    });
    scroll.scrollTop = scroll.scrollHeight;
    const last = await canvas.findByRole('button', {
      name: 'Large Session 11, Idle',
    });
    await waitFor(async () => {
      scroll.scrollTop = scroll.scrollHeight;
      const viewportBottom = scroll.getBoundingClientRect().bottom;
      await expect(
        viewportBottom - last.getBoundingClientRect().bottom,
      ).toBeGreaterThanOrEqual(0);
      await expect(last.getBoundingClientRect().bottom).toBeGreaterThan(
        scroll.getBoundingClientRect().top,
      );
    });
  },
};
export const FirstAndLastRowsReachableDark: Story = {
  ...FirstAndLastRowsReachable,
  globals: { mode: 'dark' },
};

export const PaginationSpinnerVisible: Story = {
  beforeEach: async () => {
    pagination.reset();
    const restore = delayFooterLayout();
    await settleViewport(390);
    return () => {
      pagination.release();
      restore();
    };
  },
  parameters: { screenPreview: true, trpc: pagination.fixtures },
  render: () => <SessionsScreen query="" archived={false} />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('sessions-scroll');
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight),
    );
    const initialHeight = scroll.scrollHeight;
    pagination.hold();
    scroll.scrollTop = initialHeight;
    const spinner = await canvas.findByRole('progressbar', {
      name: 'Loading more Sessions',
    });
    await waitFor(() => expect(getDelayedFooterLayouts()).toBeGreaterThan(0));
    await waitFor(
      async () => {
        const viewport = scroll.getBoundingClientRect();
        const indicator = spinner.getBoundingClientRect();
        await expect(indicator.top).toBeGreaterThanOrEqual(viewport.top);
        await expect(indicator.bottom).toBeLessThanOrEqual(viewport.bottom);
      },
      { timeout: 1000 },
    );
    pagination.release();
    await waitFor(
      () => expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(initialHeight),
    );
  },
};
export const PaginationSpinnerVisibleDark: Story = {
  ...PaginationSpinnerVisible,
  globals: { mode: 'dark' },
};
