import { archivedSessions, projectsList, sessionRows } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
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
} from '../../mocks/sessions-list-mock';
import { SessionsScreenPreview } from '../../mocks/sessions-screen-preview';
import { fails, pending } from '../../mocks/trpc-mock-link';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { applyTheme } from '../lib/theme';
import { SessionsScreen } from './SessionsScreen';

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
  render: () => <SessionsScreenPreview />,
} satisfies Meta<typeof SessionsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

async function eachLayout(assertion: () => Promise<void>) {
  if (!('__vitest_browser__' in globalThis)) {
    await assertion();
    return;
  }
  const { page } = await import('vitest/browser');
  for (const width of [390, 1440]) {
    await page.viewport(width, 844);
    // Crossing the wide breakpoint swaps the header controls, so let React settle first.
    for (let frame = 0; frame < 2; frame++)
      await new Promise((resolve) => requestAnimationFrame(resolve));
    for (const mode of ['light', 'dark'] as const) {
      applyTheme('default', mode);
      await assertion();
    }
  }
}

export const ProjectCollapse: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
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
    }),
};
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
export const ErrorAndRetry: Story = {
  parameters: { trpc: { 'session.list': fails('Server is down') } },
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByText("Couldn't load Sessions"),
      ).toBeVisible();
      await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
      await expect(
        await canvas.findByText("Couldn't load Sessions"),
      ).toBeVisible();
    }),
};
export const Search: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
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
    }),
};
export const SearchMorph: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      const surface = canvas.getByTestId('list-search-surface');
      const measureTransition = async (button: HTMLElement) => {
        const samples = new Promise<number[]>((resolve) => {
          button.addEventListener(
            'click',
            () => {
              const widths: number[] = [];
              const started = performance.now();
              function measure() {
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
      const openingWidths = await measureTransition(
        canvas.getByRole('button', { name: 'Search Sessions' }),
      );
      const input = canvas.getByRole('textbox', { name: 'Search Sessions' });
      await waitFor(() => expect(input).toHaveFocus());
      const expandedWidth = surface.getBoundingClientRect().width;
      await expect(expandedWidth).toBeGreaterThan(collapsedWidth * 3);
      await expect(
        openingWidths.some(
          (width) => width > collapsedWidth + 1 && width < expandedWidth - 1,
        ),
      ).toBe(true);
      await userEvent.type(input, 'settings');
      const closingWidths = await measureTransition(
        canvas.getByRole('button', { name: 'Close search' }),
      );
      await expect(canvas.queryByRole('textbox')).toBeNull();
      await expect(
        closingWidths.some(
          (width) => width > collapsedWidth + 1 && width < expandedWidth - 1,
        ),
      ).toBe(true);
      await expect(surface.getBoundingClientRect().width).toBeCloseTo(
        collapsedWidth,
        0,
      );
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
    }),
};

export const ArchivedFilter: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Filter Sessions' }),
      );
      await userEvent.click(
        within(document.body).getByRole('menuitemradio', { name: 'Archived' }),
      );
      await expect(
        await canvas.findByText(archivedSessions.sessions[0]?.title ?? ''),
      ).toBeVisible();
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
    }),
};
export const Navigation: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
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
    }),
};
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
      await expect(await canvas.findByText('Empty Project')).toBeVisible();
      await expect(canvas.getByText('No Sessions yet.')).toBeVisible();
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
      waitFor(() => {
        const rows = canvas
          .getAllByRole('button')
          .filter((row) =>
            row.getAttribute('aria-label')?.endsWith(', Running'),
          )
          .sort(
            (a, b) =>
              a.getBoundingClientRect().top - b.getBoundingClientRect().top,
          );
        expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
          'Newest activity, Running',
          'Build the settings screen, Running',
        ]);
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
      await waitFor(() => {
        const viewport = canvas
          .getByTestId('sessions-scroll')
          .getBoundingClientRect();
        const indicator = spinner.getBoundingClientRect();
        expect(indicator.top).toBeGreaterThanOrEqual(viewport.top);
        expect(indicator.bottom).toBeLessThanOrEqual(viewport.bottom);
      });
      await expect(canvas.getByText('Build the settings screen')).toBeVisible();
    }),
};
