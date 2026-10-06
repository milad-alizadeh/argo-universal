import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import {
  arrivingMessage,
  arrivingRowSessionMocks,
  emptySessionMocks,
  idleSessionMocks,
  loadingOlderSessionMocks,
  longSessionMocks,
  oldestMessage,
  runningHeader,
  runningSessionMocks,
  sendArrivingRow,
  sessionNow,
  twoSessionMocks,
} from '../../mocks/session-screen-mock';
import { SessionScreenPreview } from '../../mocks/session-screen-preview';
import {
  SessionSwitchPreview,
  switchSession,
} from '../../mocks/session-switch-preview';
import { settleViewport } from '../../mocks/settle-viewport';
import { applyTheme } from '../lib/theme';
import { SessionScreen } from './SessionScreen';

const meta = {
  title: 'Tests/SessionScreen',
  component: SessionScreen,
  parameters: { trpc: runningSessionMocks, screenPreview: true },
  args: { id: 'session-1', now: sessionNow },
  render: (args) => <SessionScreenPreview {...args} />,
} satisfies Meta<typeof SessionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

const widths = { phone: 390, wide: 1440 } as const;

// Runs the assertion at phone and wide widths, in light and dark.
async function eachLayout(
  assertion: (layout: keyof typeof widths) => Promise<void>,
) {
  if (!('__vitest_browser__' in globalThis)) {
    await assertion('phone');
    return;
  }
  for (const layout of ['phone', 'wide'] as const) {
    await settleViewport(widths[layout]);
    for (const mode of ['light', 'dark'] as const) {
      applyTheme('default', mode);
      await assertion(layout);
    }
  }
  applyTheme('default', 'light');
}

function inViewport(element: Element) {
  const box = element.getBoundingClientRect();
  return (
    box.height > 0 &&
    box.top >= 0 &&
    box.bottom <= window.innerHeight &&
    box.left >= 0 &&
    box.right <= window.innerWidth
  );
}

export const RunningTurn: Story = {
  play: async ({ canvas }) =>
    eachLayout(async (layout) => {
      const heading = await canvas.findByRole('heading', {
        name: /^Think briefly first/,
      });
      await expect(heading).toBeVisible();
      if (layout === 'wide') {
        await expect(canvas.getByText('Running')).toBeVisible();
        await expect(canvas.getByText('for 4m 12s')).toBeVisible();
      } else {
        // The native header holds the plain title and two items, no status.
        await expect(
          canvas.getByRole('button', { name: 'Changes' }),
        ).toBeVisible();
        await expect(canvas.queryByText('Running')).toBeNull();
      }
      await expect(canvas.getByRole('button', { name: 'More' })).toBeVisible();
      await expect(canvas.getByRole('button', { name: 'Stop' })).toBeVisible();
      await expect(canvas.getByRole('status')).toHaveTextContent(
        runningHeader.text,
      );
    }),
};

export const Idle: Story = {
  parameters: { trpc: idleSessionMocks },
  play: async ({ canvas }) =>
    eachLayout(async (layout) => {
      await expect(
        await canvas.findByRole('heading', {
          name: /^Without using any tools/,
        }),
      ).toBeVisible();
      if (layout === 'wide') {
        await expect(canvas.getByText('Idle')).toBeVisible();
        await expect(canvas.queryByText(/^for /)).toBeNull();
      }
      await expect(canvas.queryByRole('status')).toBeNull();
      await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull();
      // The newest row sits at the bottom, above the Composer.
      await waitFor(() =>
        expect(inViewport(canvas.getByText('Redraws'))).toBe(true),
      );
    }),
};

export const LoadingEarlier: Story = {
  parameters: { trpc: loadingOlderSessionMocks },
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('feed-scroll');
    scroll.scrollTop = 0;
    scroll.dispatchEvent(new Event('scroll'));
    await eachLayout(async () => {
      const indicator = await canvas.findByRole('progressbar', {
        name: 'Loading earlier',
      });
      await waitFor(() => expect(inViewport(indicator)).toBe(true));
    });
  },
};

export const PagesOlderRows: Story = {
  parameters: { trpc: longSessionMocks },
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('feed-scroll');
    const feed = within(scroll);
    await expect(feed.queryAllByText(oldestMessage)).toHaveLength(0);
    // Reads back a screen at a time, as a reader does, until the oldest page has loaded and drawn.
    await waitFor(
      async () => {
        scroll.scrollTop = Math.max(0, scroll.scrollTop - scroll.clientHeight);
        scroll.dispatchEvent(new Event('scroll'));
        await expect(feed.queryAllByText(oldestMessage).length).toBeGreaterThan(
          0,
        );
      },
      { timeout: 15000, interval: 100 },
    );
  },
};

export const JumpsToLatest: Story = {
  parameters: { trpc: arrivingRowSessionMocks },
  play: async ({ canvas }) => {
    // At a phone's size the Feed overflows a screen, so the reader can scroll away from the end.
    if ('__vitest_browser__' in globalThis) await settleViewport(widths.phone);
    const scroll = await canvas.findByTestId('feed-scroll');
    const feed = within(scroll);
    const atEnd = () =>
      scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 2;
    await waitFor(() => expect(atEnd()).toBe(true));
    await expect(
      canvas.queryByRole('button', { name: /Jump to latest/ }),
    ).toBeNull();
    // The Feed settles at the end as it opens, so the reader scrolls up until it stays up.
    await waitFor(async () => {
      if (atEnd()) {
        scroll.scrollTop -= scroll.clientHeight;
        scroll.dispatchEvent(new Event('scroll'));
      }
      await expect(
        canvas.getByRole('button', { name: 'Jump to latest' }),
      ).toBeVisible();
    });
    // A row arriving while the reader is away leaves what they read where it was; rows above may still measure, so compare the screen, not scrollTop.
    const view = scroll.getBoundingClientRect();
    const reading = document.elementFromPoint(
      view.left + view.width / 2,
      view.top + view.height / 2,
    );
    if (!reading) throw new Error('Nothing in view');
    const readingAt = reading.getBoundingClientRect().top;
    sendArrivingRow();
    const jump = await canvas.findByRole('button', {
      name: 'Jump to latest, new rows',
    });
    await expect(
      Math.abs(reading.getBoundingClientRect().top - readingAt),
    ).toBeLessThan(2);
    jump.click();
    await waitFor(() => expect(atEnd()).toBe(true));
    await expect(await feed.findByText(arrivingMessage)).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: /Jump to latest/ }),
      ).toBeNull(),
    );
  },
};

export const KeepsPlaceWhenRowOpens: Story = {
  parameters: { trpc: longSessionMocks },
  play: async ({ canvas }) => {
    if ('__vitest_browser__' in globalThis) await settleViewport(widths.phone);
    const scroll = await canvas.findByTestId('feed-scroll');
    const atEnd = () =>
      scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 2;
    await waitFor(() => expect(atEnd()).toBe(true));
    // Away from the end, opening a row grows the Feed below it and leaves the rows above where they were.
    const closedRowInView = () => {
      const view = scroll.getBoundingClientRect();
      return within(scroll)
        .queryAllByRole('button', { expanded: false })
        .find((button) => {
          const { top } = button.getBoundingClientRect();
          return top > view.top + 40 && top < view.top + view.height / 2;
        });
    };
    // Reads back a third of a screen at a time until a closed row sits in the top half.
    let trigger: HTMLElement | undefined;
    await waitFor(
      () => {
        trigger = closedRowInView();
        if (!trigger) {
          scroll.scrollTop -= scroll.clientHeight / 3;
          scroll.dispatchEvent(new Event('scroll'));
        }
        expect(trigger).toBeDefined();
      },
      { timeout: 5000, interval: 100 },
    );
    if (!trigger) throw new Error('No closed row in view');
    // A reader opens a row they have read, so the rows around it have measured.
    let settledAt = -1;
    await waitFor(
      () => {
        const top = trigger?.getBoundingClientRect().top ?? 0;
        const still = top === settledAt;
        settledAt = top;
        expect(still).toBe(true);
      },
      { timeout: 5000, interval: 250 },
    );
    const triggerAt = trigger.getBoundingClientRect().top;
    trigger.click();
    await waitFor(() =>
      expect(trigger).toHaveAttribute('aria-expanded', 'true'),
    );
    // Long enough for the open animation to finish.
    await new Promise((resolve) => setTimeout(resolve, 600));
    await expect(
      Math.abs(trigger.getBoundingClientRect().top - triggerAt),
    ).toBeLessThan(2);
    await expect(atEnd()).toBe(false);
  },
};

export const SwitchesSessions: Story = {
  parameters: { trpc: twoSessionMocks },
  render: (args) => <SessionSwitchPreview {...args} />,
  play: async ({ canvas }) => {
    if ('__vitest_browser__' in globalThis) await settleViewport(widths.phone);
    await canvas.findByRole('heading', { name: /^Think briefly first/ });
    await expect(canvas.getByRole('button', { name: 'Stop' })).toBeVisible();
    switchSession('session-2');
    // The next Session opens at its own newest row, with none of the last one's rows or state.
    await canvas.findByRole('heading', { name: /^Without using any tools/ });
    await expect(canvas.queryByText(/^Think briefly first/)).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull();
    await expect(canvas.queryByRole('status')).toBeNull();
    await waitFor(() =>
      expect(inViewport(canvas.getByText('Redraws'))).toBe(true),
    );
    await expect(
      canvas.queryByRole('button', { name: /Jump to latest/ }),
    ).toBeNull();
  },
};

export const EmptyFeed: Story = {
  parameters: { trpc: emptySessionMocks },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('heading', { name: 'What should we build?' }),
      ).toBeVisible();
      await expect(canvas.queryByTestId('feed-scroll')).toBeNull();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
    }),
};
