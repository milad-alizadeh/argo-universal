import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
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
  onNewSession,
  onProjectSettings,
  sessionsScrollId,
  type Story,
} from '../../../../../mocks/sessions-list/sessions-list-story-context.test.mocks';
import { SessionsList } from './sessions-list';
import { largeSessions, sessionsListProps } from './sessions-list.mocks';

const expandedAttribute = 'aria-expanded';

const meta = { ...sessionsListMeta, title: 'Tests/SessionsList' };

export default meta;

export const MemoizedRows: Story = {
  ...memoizedRows,
  name: 'Controlled selection and activity',
};

// A wide window's heading keeps ⋯ and +, shown on hover or focus.
export const ProjectActions: Story = {
  beforeEach: () => settleViewport(layoutWidths.wide),
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('button', {
      name: exampleProjectName,
    });

    await waitFor(() => expect(heading).toBeVisible());
    // The test browser has no real pointer, so keyboard focus stands in for hover: each button shows itself when focused.
    await userEvent.keyboard('{Shift}');

    const settings = canvas.getByRole('button', {
      name: 'Project settings for Example Project',
    });

    const newSession = canvas.getByRole('button', {
      name: 'New Session in Example Project',
    });

    settings.focus();
    await waitFor(() => expect(settings).toBeVisible());
    newSession.focus();
    await waitFor(() => expect(newSession).toBeVisible());
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

export const PhoneProjectMenu = phoneProjectMenu;

export const FlatSearchResults: Story = {
  args: { query: 'a', flat: true },
  play: async ({ canvas }) => {
    const [firstSession] = sessionsListProps.sessions;

    if (!firstSession) throw new Error('Missing Session mock');

    const [firstRow] = await canvas.findAllByText(firstSession.title);
    await expect(firstRow).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: exampleProjectName }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: /^New Session in / }),
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
  'No Session has "xyz" in its title.',
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
    if ('__vitest_browser__' in globalThis) await settleViewport(390);
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
