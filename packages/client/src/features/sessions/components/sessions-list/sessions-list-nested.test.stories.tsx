import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, waitFor } from 'storybook/test';
import {
  meta as sessionsMeta,
  type Story,
} from '../../../../../mocks/sessions-list/sessions-list-story-context.test.mocks';
import {
  nestedPlans,
  nestedSessions,
  orphanSessions,
} from './sessions-list-nested-fixtures';

const parentTitle = 'Investigate the regression';

const childTitle = 'Review the change';

const descendantTitle = 'Check the edge cases';

const meta = { ...sessionsMeta, title: 'Tests/Sessions/SessionsList/Nested' };

export default meta;

export const FoldDelegatedWork: Story = {
  args: nestedSessions,
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas, userEvent }) => {
    const fold = await canvas.findByRole('button', {
      name: parentTitle,
    });

    await waitFor(() => expect(canvas.getByText(childTitle)).toBeVisible());
    await waitFor(() =>
      expect(canvas.getByText(descendantTitle)).toBeVisible(),
    );
    await userEvent.click(fold);
    await expect(canvas.queryByText(childTitle)).not.toBeInTheDocument();
    await expect(canvas.queryByText(descendantTitle)).not.toBeInTheDocument();
    await userEvent.click(fold);
    await waitFor(() => expect(canvas.getByText(childTitle)).toBeVisible());
  },
};

export const PhoneDelegatedWork: Story = {
  args: nestedSessions,
  beforeEach: () => settleLayout('phone'),
  play: async ({ canvas }) => {
    const rows = await canvas.findAllByRole('button', { name: /, Idle$/ });

    await expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      'Investigate the regression, Idle',
      'Review the change, Idle',
      'Check the edge cases, Idle',
    ]);
  },
};

export const FilteredParent: Story = {
  args: orphanSessions,
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText(childTitle)).toBeVisible());
    await expect(canvas.queryByText(parentTitle)).not.toBeInTheDocument();
  },
};

const leftOf = (element: Element): number =>
  Math.round(element.getBoundingClientRect().left);

// A nested row's progress bar starts under its own title, one tree lane further in per level, not under the root's.
export const NestedTodoBars: Story = {
  args: nestedPlans,
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas }) => {
    const titles = [parentTitle, childTitle, descendantTitle];

    await waitFor(() =>
      expect(canvas.getAllByRole('progressbar')).toHaveLength(3),
    );

    const bars = canvas.getAllByRole('progressbar');
    const starts = titles.map((title) => leftOf(canvas.getByText(title)));

    await expect(bars.map(leftOf)).toEqual(starts);
  },
};
