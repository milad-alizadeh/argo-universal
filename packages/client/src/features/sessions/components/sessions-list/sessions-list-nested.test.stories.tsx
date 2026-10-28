import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, waitFor } from 'storybook/test';
import {
  meta as sessionsMeta,
  type Story,
} from '../../../../../mocks/sessions-list/sessions-list-story-context.test.mocks';
import {
  nestedSessions,
  orphanSessions,
} from './sessions-list-nested-fixtures';

const childTitle = 'Review the change';

const meta = { ...sessionsMeta, title: 'Tests/Sessions/SessionsList/Nested' };

export default meta;

export const FoldDelegatedWork: Story = {
  args: nestedSessions,
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas, userEvent }) => {
    const fold = await canvas.findByRole('button', {
      name: 'Investigate the regression',
    });

    await waitFor(() => expect(canvas.getByText(childTitle)).toBeVisible());
    await waitFor(() =>
      expect(canvas.getByText('Check the edge cases')).toBeVisible(),
    );
    await userEvent.click(fold);
    await expect(canvas.queryByText(childTitle)).not.toBeInTheDocument();
    await expect(
      canvas.queryByText('Check the edge cases'),
    ).not.toBeInTheDocument();
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
    await expect(
      canvas.queryByText('Investigate the regression'),
    ).not.toBeInTheDocument();
  },
};
