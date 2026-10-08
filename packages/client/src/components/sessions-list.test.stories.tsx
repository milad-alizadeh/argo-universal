import { sessionRows } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { expect, fn, waitFor } from 'storybook/test';
import {
  delayFooterLayout,
  getDelayedFooterLayouts,
  installFooterLayoutDelay,
} from '../../mocks/delayed-footer-layout';
import { createSessionListUpdatesMock } from '../../mocks/session-list-updates-mock';
import {
  sessionsListProps,
  largeSessions,
} from '../../mocks/sessions-list-mock';
import { renderingSessions } from '../../mocks/sessions-rendering-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { SessionsScreen } from '../screens/sessions-screen';
import { scrollFadeHeight } from './scroll-fade';
import { SessionsList } from './sessions-list';

const onNewSession = fn();
const onProjectSettings = fn();
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
  sessions: largeSessions.slice(0, 12),
});
const pagination = createSessionListUpdatesMock({
  sessions: largeSessions.slice(0, 100),
  pageSize: 20,
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
        name: 'Unchanged Session, Idle',
      });
      const selectable = canvas.getByRole('button', {
        name: 'Selectable Session, Idle',
      });
      await userEvent.click(selectable);
      await expect(args.onSelect).toHaveBeenCalledWith('memo-selectable');
      render({ ...props, selectedSessionId: 'memo-selectable' });
      await waitFor(() =>
        expect(selectable).toHaveAttribute('aria-selected', 'true'),
      );
      await expect(
        canvas.getByRole('button', { name: 'Unchanged Session, Idle' }),
      ).toBe(unchanged);
      render({
        ...props,
        selectedSessionId: 'memo-selectable',
        sessions: renderingSessions.map((session) =>
          session.sessionId === 'memo-updated'
            ? { ...session, activity: 'Session activity updated' }
            : session,
        ),
      });
      await canvas.findByText('Session activity updated');
      await expect(
        canvas.getByRole('button', { name: 'Unchanged Session, Idle' }),
      ).toBe(unchanged);
    } finally {
      root.unmount();
    }
  },
};

export const ProjectActions: Story = {
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('button', {
      name: 'Example Project',
    });
    await waitFor(() => expect(heading).toBeVisible());
    await userEvent.hover(heading);
    const settings = canvas.getByRole('button', {
      name: 'Project settings for Example Project',
    });
    const newSession = canvas.getByRole('button', {
      name: 'New Session in Example Project',
    });
    const actions = settings.parentElement;
    if (!actions) throw new Error('Missing Project actions');
    await waitFor(() => expect(getComputedStyle(actions).opacity).toBe('1'));
    await expect(settings).toBeVisible();
    await expect(newSession).toBeVisible();
    await userEvent.click(settings);
    await expect(onProjectSettings).toHaveBeenCalledWith('Example Project');
    await userEvent.click(newSession);
    await expect(onNewSession).toHaveBeenCalledWith(
      sessionsListProps.projects[0]?.id,
    );
    await expect(heading).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(heading);
    await expect(heading).toHaveAttribute('aria-expanded', 'false');
    await expect(heading).toHaveTextContent(/^Example Project$/);
    await userEvent.hover(heading);
    await userEvent.click(newSession);
    await expect(heading).toHaveAttribute('aria-expanded', 'false');
  },
};
export const ProjectActionsDark: Story = {
  ...ProjectActions,
  globals: { mode: 'dark' },
};

export const InsertSessionOpaqueRows: Story = {
  parameters: { screenPreview: true, trpc: insertion.fixtures },
  beforeEach: () => insertion.reset(),
  render: () => <SessionsScreen query="" archived={false} />,
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('button', {
      name: 'Example Project',
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
    insertion.publish({
      type: 'changed',
      session: {
        ...sessionRows.idle,
        sessionId: 'new-session-1',
        title: 'New Session 1',
        activity: 'Session created',
        activityAt: 3000,
      },
    });
    const inserted = await canvas.findByRole('button', {
      name: 'New Session 1, Idle',
    });
    async function assertOpaqueRow(button: HTMLElement): Promise<void> {
      const surface = button.parentElement;
      if (!surface) throw new Error('Missing Session row surface');
      const color = getComputedStyle(surface).backgroundColor;
      await expect(
        color,
        'The animated row surface must be opaque, not only its button',
      ).not.toBe('rgba(0, 0, 0, 0)');
      await expect(color).not.toBe('transparent');
      await expect(getComputedStyle(surface).opacity).toBe('1');
      await expect(getComputedStyle(surface).overflow).toBe('hidden');
    }
    await assertOpaqueRow(inserted);
    await assertOpaqueRow(existing);
    for (let frame = 0; frame < 12; frame++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      await assertOpaqueRow(inserted);
      await assertOpaqueRow(existing);
      positions.push(existing.getBoundingClientRect().top);
    }
    await waitFor(async () => {
      const newRectangle = inserted.getBoundingClientRect();
      const oldRectangle = existing.getBoundingClientRect();
      await expect(newRectangle.bottom).toBeLessThanOrEqual(
        oldRectangle.top + 1,
      );
    });
    await movement;
    const finalTop = existing.getBoundingClientRect().top;
    await expect(finalTop - initialTop).toBeGreaterThan(20);
    await expect(
      positions.some((top) => top > initialTop + 1 && top < finalTop - 1),
      'Existing rows must pass through intermediate positions, not jump',
    ).toBe(true);
    await userEvent.hover(inserted);
    await assertOpaqueRow(inserted);
  },
};
export const InsertSessionOpaqueRowsDark: Story = {
  ...InsertSessionOpaqueRows,
  globals: { mode: 'dark' },
};

export const ScrollFadePadding: Story = {
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
      name: 'Example Project',
    });
    await waitFor(async () => {
      await expect(
        heading.getBoundingClientRect().top -
          scroll.getBoundingClientRect().top,
      ).toBeGreaterThanOrEqual(19);
    });
    // The top fade waits until content has scrolled under the header.
    await expect(canvas.queryByTestId('scroll-fade-top')).toBeNull();
    // Until the rows measure, the list is not yet tall enough to scroll.
    await waitFor(async () => {
      scroll.scrollTop = 40;
      await expect(scroll.scrollTop).toBeGreaterThan(0);
    });
    const topFade = await canvas.findByTestId('scroll-fade-top');
    const bottomFade = canvas.getByTestId('scroll-fade-bottom');
    const surface = topFade.parentElement;
    if (!surface) throw new Error('Missing list surface');
    await expect(
      getComputedStyle(surface).maskImage,
      'The list surface must stay opaque instead of revealing the page behind it',
    ).toBe('none');
    const surfaceColor = getComputedStyle(surface).backgroundColor;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = colorCanvas.height = 1;
    const context = colorCanvas.getContext('2d');
    if (!context) throw new Error('Missing browser color context');
    function colorPixel(color: string): number[] {
      if (!context) throw new Error('Missing browser color context');
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    }
    for (const fade of [topFade, bottomFade]) {
      const stops = fade.querySelectorAll('stop');
      await expect(stops.length).toBeGreaterThan(0);
      for (const stop of stops)
        await expect(colorPixel(getComputedStyle(stop).stopColor)).toEqual(
          colorPixel(surfaceColor),
        );
    }
    await expect(topFade.getBoundingClientRect().height).toBe(
      scrollFadeHeight.top,
    );
    await expect(bottomFade.getBoundingClientRect().height).toBe(
      scrollFadeHeight.bottom,
    );
    scroll.scrollTop = scroll.scrollHeight;
    const last = await canvas.findByRole('button', {
      name: 'Large Session 11, Idle',
    });
    await waitFor(async () => {
      scroll.scrollTop = scroll.scrollHeight;
      const viewportBottom = scroll.getBoundingClientRect().bottom;
      await expect(
        viewportBottom - last.getBoundingClientRect().bottom,
      ).toBeGreaterThanOrEqual(27);
      await expect(last.getBoundingClientRect().bottom).toBeGreaterThan(
        scroll.getBoundingClientRect().top,
      );
    });
  },
};
export const ScrollFadePaddingDark: Story = {
  ...ScrollFadePadding,
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
        await expect(indicator.top).toBeGreaterThanOrEqual(viewport.top + 20);
        await expect(indicator.bottom).toBeLessThanOrEqual(
          viewport.bottom - 28,
        );
      },
      { timeout: 1000 },
    );
    pagination.release();
    await waitFor(
      () => expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(initialHeight + 500),
    );
  },
};
export const PaginationSpinnerVisibleDark: Story = {
  ...PaginationSpinnerVisible,
  globals: { mode: 'dark' },
};
