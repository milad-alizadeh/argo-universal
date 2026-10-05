import { archivedSessions, projectsList, sessionRows } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import {
  largeSessionListMocks,
  multipleProjectsMocks,
  nextPageFailureMocks,
  nextPageLoadingMocks,
} from '../../mocks/projects-list-mock';
import { ProjectsScreenPreview } from '../../mocks/projects-screen-preview';
import {
  emptySessionListMocks,
  sessionListMocks,
} from '../../mocks/session-list-mock';
import { createSessionListUpdatesMock } from '../../mocks/session-list-updates-mock';
import { fails, pending } from '../../mocks/trpc-mock-link';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { applyTheme } from '../lib/theme';
import { ProjectsScreen } from './ProjectsScreen';

const recorder = createNavigationRecorder();
const meta = {
  title: 'Tests/ProjectsScreen',
  component: ProjectsScreen,
  parameters: {
    trpc: sessionListMocks,
    previewPadding: false,
    navigation: recorder,
  },
  render: () => (
    <ProjectsScreenPreview>
      <ProjectsScreen />
    </ProjectsScreenPreview>
  ),
} satisfies Meta<typeof ProjectsScreen>;
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
      await expect(input).toHaveFocus();
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
    await eachLayout(async () => {
      const rows = canvas
        .getAllByRole('button')
        .filter((row) => row.getAttribute('aria-label')?.endsWith(', Running'))
        .sort(
          (a, b) =>
            a.getBoundingClientRect().top - b.getBoundingClientRect().top,
        );
      await expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
        'Newest activity, Running',
        'Build the settings screen, Running',
      ]);
    });
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
      const scroll = await canvas.findByTestId('projects-scroll');
      scroll.scrollTop = 0;
      await waitFor(() =>
        expect(canvas.getByTestId('scroll-fade-bottom')).toBeVisible(),
      );
      await expect(canvas.queryByTestId('scroll-fade-top')).toBeNull();
      scroll.scrollTop = 200;
      await waitFor(() =>
        expect(canvas.getByTestId('scroll-fade-top')).toBeVisible(),
      );
      scroll.scrollTop = scroll.scrollHeight;
      await waitFor(() =>
        expect(canvas.queryByTestId('scroll-fade-bottom')).toBeNull(),
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
      await expect(
        await canvas.findByRole('progressbar', {
          name: 'Loading more Sessions',
        }),
      ).toBeVisible();
      await expect(canvas.getByText('Build the settings screen')).toBeVisible();
    }),
};
