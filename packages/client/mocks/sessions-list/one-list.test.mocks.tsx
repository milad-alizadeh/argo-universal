import { expect } from 'storybook/test';
import { eachLayout } from '#lib/generic/each-layout';
import type { SessionsListProps } from '../../src/features/sessions/components/sessions-list/sessions-list-props';
import { sessionsListProps } from '../../src/features/sessions/components/sessions-list/sessions-list.mocks';
import {
  defaultSessionsView,
  type SessionsView,
} from '../../src/features/sessions/stores/sessions-view';
import {
  exampleProjectName,
  type Story,
} from './sessions-list-story-context.test.mocks';

// One list: every Session in one run with no Project headings, each row showing how long ago it was active.
export const oneList: Story = {
  args: { view: { ...defaultSessionsView, group: 'none' } },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      for (const session of sessionsListProps.sessions)
        await expect(
          (await canvas.findAllByText(session.title))[0],
        ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: exampleProjectName }),
      ).not.toBeInTheDocument();
      await expect(
        canvas.getAllByText(/^(now|\d+[mhdw])$/).length,
      ).toBeGreaterThan(0);
    }),
};

// What an empty list says for each status, grouping and search.
export function emptyCopy(
  {
    query,
    ...view
  }: Partial<Pick<SessionsView, 'group' | 'status'>> &
    Pick<Partial<SessionsListProps>, 'query'>,
  title: string,
  message?: string,
): Story {
  return {
    args: {
      sessions: [],
      query: query ?? '',
      view: { ...defaultSessionsView, ...view },
    },
    play: async ({ canvas }) =>
      eachLayout(async () => {
        await expect(await canvas.findByText(title)).toBeVisible();

        if (message) await expect(canvas.getByText(message)).toBeVisible();
      }),
  };
}
