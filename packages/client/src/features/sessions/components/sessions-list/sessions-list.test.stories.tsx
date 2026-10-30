import { settleLayout } from '@repo/kit/mocks/story-layout';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { fadedEdges } from '../../../../../mocks/scroll-fade';
import { firstAndLastRowsReachable } from '../../../../../mocks/sessions-list/first-and-last-rows.test.mocks';
import { insertSessionWithoutOverlap } from '../../../../../mocks/sessions-list/insert-session.test.mocks';
import { memoizedRows } from '../../../../../mocks/sessions-list/memoized-rows.test.mocks';
import {
  emptyCopy,
  oneList,
} from '../../../../../mocks/sessions-list/one-list.test.mocks';
import { phoneProjectMenu } from '../../../../../mocks/sessions-list/phone-project-menu.test.mocks';
import {
  exampleProjectName,
  meta as sessionsListMeta,
  newSessionLabel,
  onNewSession,
  onProjectSettings,
  projectButtonName,
  projectSettingsLabel,
  sessionsScrollId,
  type Story,
} from '../../../../../mocks/sessions-list/sessions-list-story-context.test.mocks';
import { SidebarFrame } from '../../../../../mocks/sessions-list/sidebar-frame.test.mocks';
import { SessionsList } from './sessions-list';
import { largeSessions, sessionsListProps } from './sessions-list.mocks';

const expandedAttribute = 'aria-expanded';

const meta = { ...sessionsListMeta, title: 'Tests/Sessions/SessionsList' };

export default meta;

export const MemoizedRows: Story = {
  ...memoizedRows,
  name: 'Controlled selection and activity',
};

export const ProjectActions: Story = {
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('button', {
      name: exampleProjectName,
    });

    await waitFor(() => expect(heading).toBeVisible());
    await browserUser.hover(heading);

    const settings = canvas.getByRole('button', {
      name: projectButtonName(projectSettingsLabel),
    });

    const newSession = canvas.getByRole('button', {
      name: projectButtonName(newSessionLabel),
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
    await browserUser.hover(heading);
    await userEvent.click(newSession);
    await expect(heading).toHaveAttribute(expandedAttribute, 'false');
  },
};

export const PhoneProjectMenu = phoneProjectMenu;

// One list's search results: no Project headings, each row showing how long ago it was active, as Android's search always lists them.
export const FlatSearchResults: Story = {
  args: { query: 'a', view: { ...sessionsListProps.view, group: 'none' } },
  play: async ({ canvas }) => {
    const [firstSession] = sessionsListProps.sessions;

    if (!firstSession) throw new Error('Missing Session mock');

    const [firstRow] = await canvas.findAllByText(firstSession.title);
    await expect(firstRow).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: exampleProjectName }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', {
        name: projectButtonName(newSessionLabel),
      }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getAllByText(/^(now|\d+[mhdw])$/).length,
    ).toBeGreaterThan(0);
  },
};

export const OneList = oneList;

export const EmptyOneListActive = emptyCopy(
  { group: 'none' },
  'No active Sessions',
);

export const EmptyOneListAll = emptyCopy(
  { group: 'none', status: 'all' },
  'No Sessions',
);

export const SearchMissInAll = emptyCopy(
  { status: 'all', query: 'xyz' },
  'No matching Sessions',
  /"xyz"/,
);

export const ProjectActionsDark: Story = {
  ...ProjectActions,
  globals: { mode: 'dark' },
};

export const InsertSessionWithoutOverlap = insertSessionWithoutOverlap;

export const InsertSessionWithoutOverlapDark: Story = {
  ...InsertSessionWithoutOverlap,
  globals: { mode: 'dark' },
};

export const FirstAndLastRowsReachable = firstAndLastRowsReachable;

export const FirstAndLastRowsReachableDark: Story = {
  ...FirstAndLastRowsReachable,
  globals: { mode: 'dark' },
};

export const LargeListRendersWindow: Story = {
  parameters: { screenPreview: true },
  render: (args) => (
    <View className="flex-1 w-full wide:w-frame-list" style={{ minHeight: 0 }}>
      <SessionsList {...args} sessions={largeSessions} />
    </View>
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Large Session 0')).toBeVisible();
    await expect(canvas.queryByText('Large Session 1999')).toBeNull();
    await expect(
      canvas.getAllByRole('button', { name: /^Large Session \d+, Idle$/ })
        .length,
    ).toBeLessThan(100);
  },
};

export const ScrollFade: Story = {
  parameters: { screenPreview: true },
  render: (args) => (
    <View className="flex-1 w-full wide:w-frame-list" style={{ minHeight: 0 }}>
      <SessionsList {...args} sessions={largeSessions.slice(0, 40)} />
    </View>
  ),
  play: async ({ canvas }) => {
    if ('__vitest_browser__' in globalThis) await settleLayout('phone');
    const scroll = await canvas.findByTestId(sessionsScrollId);
    scroll.scrollTop = 0;
    // The last rows always sink into the bottom edge; the top fades once rows scroll under it.
    await waitFor(() =>
      expect(fadedEdges(scroll)).toEqual({ top: false, bottom: true }),
    );
    scroll.scrollTop = 200;
    await waitFor(() =>
      expect(fadedEdges(scroll)).toEqual({ top: true, bottom: true }),
    );
    scroll.scrollTop = scroll.scrollHeight;
    await waitFor(() =>
      expect(fadedEdges(scroll)).toEqual({ top: true, bottom: true }),
    );
  },
};

// Measure the public row surfaces against the usable scroll viewport at each sidebar width.
function sidebarGutters(width: number, grouped: boolean): Story {
  const selected = sessionsListProps.sessions[0];

  if (!selected) throw new Error('Recorded catalog needs a Session');

  return {
    args: {
      selectedSessionId: selected.sessionId,
      view: { ...sessionsListProps.view, group: grouped ? 'project' : 'none' },
    },
    beforeEach: () => settleLayout('wide'),
    render: (args) => (
      <View style={{ width, height: 500 }}>
        <SessionsList {...args} />
      </View>
    ),
    play: async ({ canvas }) => {
      const scroll = await canvas.findByTestId(sessionsScrollId);
      const rows = await canvas.findAllByTestId('session-row-surface');
      await expect(rows.length).toBeGreaterThan(1);

      const viewport = scroll.getBoundingClientRect();

      for (const row of rows.slice(0, 2)) {
        const bounds = row.getBoundingClientRect();
        const left = bounds.left - viewport.left;
        const right = viewport.left + scroll.clientWidth - bounds.right;

        await expect(left).toBeGreaterThan(0);
        await expect(left).toBeLessThanOrEqual(8);
        await expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
      }

      const heading = canvas.queryByRole('button', {
        name: exampleProjectName,
      });

      await expect(Boolean(heading)).toBe(grouped);
    },
  };
}

export const NarrowSidebarGutters = sidebarGutters(240, true);

export const DefaultSidebarGutters = sidebarGutters(312, false);

export const ExpandedSidebarGutters = sidebarGutters(420, true);

// Include the Frame's offered column as well as the Sessions list's own inset.
export const FramedSidebarGutters: Story = {
  args: { selectedSessionId: sessionsListProps.sessions[0]?.sessionId },
  parameters: { screenPreview: true },
  beforeEach: () => settleLayout('wide'),
  render: (args) => (
    <SidebarFrame>
      <SessionsList {...args} />
    </SidebarFrame>
  ),
  play: async ({ canvas }) => {
    const region = await canvas.findByTestId('desktop-list');
    const row = (await canvas.findAllByTestId('session-row-surface'))[0];

    if (!row) throw new Error('Recorded catalog needs a Session');
    await waitFor(async () => {
      const pane = region.getBoundingClientRect();
      const bounds = row.getBoundingClientRect();
      const left = bounds.left - pane.left;
      const right = pane.right - bounds.right;

      await expect(left).toBeGreaterThan(0);
      await expect(left).toBeLessThan(16);
      await expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    });
  },
};
