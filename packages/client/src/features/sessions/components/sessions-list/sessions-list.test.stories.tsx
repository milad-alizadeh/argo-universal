import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { firstAndLastRowsReachable } from '../../../../../mocks/sessions-list/first-and-last-rows.test.mocks';
import { insertSessionWithoutOverlap } from '../../../../../mocks/sessions-list/insert-session.test.mocks';
import { memoizedRows } from '../../../../../mocks/sessions-list/memoized-rows.test.mocks';
import { paginationSpinnerVisible } from '../../../../../mocks/sessions-list/pagination-spinner.test.mocks';
import {
  exampleProjectName,
  meta as sessionsListMeta,
  onNewSession,
  onProjectSettings,
  sessionsScrollId,
  type Story,
} from '../../../../../mocks/sessions-list/sessions-list-story-context.test.mocks';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { SessionsList } from './sessions-list';
import { largeSessions, sessionsListProps } from './sessions-list.mocks';

const expandedAttribute = 'aria-expanded';

const meta = { ...sessionsListMeta, title: 'Tests/SessionsList' };
export default meta;

export const MemoizedRows: Story = {
  ...memoizedRows,
  name: 'Controlled selection and activity',
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

export const PaginationSpinnerVisible = paginationSpinnerVisible;
export const PaginationSpinnerVisibleDark: Story = {
  ...PaginationSpinnerVisible,
  globals: { mode: 'dark' },
};

export const LargeListRendersWindow: Story = {
  parameters: { screenPreview: true },
  render: (args) => (
    <View className="flex-1 w-full wide:w-shell-list" style={{ minHeight: 0 }}>
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
    <View className="flex-1 w-full wide:w-shell-list" style={{ minHeight: 0 }}>
      <SessionsList {...args} sessions={largeSessions.slice(0, 40)} />
    </View>
  ),
  play: async ({ canvas }) => {
    if ('__vitest_browser__' in globalThis) await settleViewport(390);
    const scroll = await canvas.findByTestId(sessionsScrollId);
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
  },
};
