import { expect } from 'storybook/test';
import { eachLayout } from '#lib/generic/each-layout';
import type { SessionsListProps } from '../../src/features/sessions/components/sessions-list/sessions-list-props';
import { sessionsListProps } from '../../src/features/sessions/components/sessions-list/sessions-list.mocks';
import {
  exampleProjectName,
  type Story,
} from './sessions-list-story-context.test.mocks';

// One list: every Session in one run with no Project headings, each row showing how long ago it was active.
export const oneList: Story = {
  args: { group: 'none' },
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
  args: Pick<Partial<SessionsListProps>, 'group' | 'status' | 'query'>,
  title: string,
  message?: string,
): Story {
  return {
    args: { sessions: [], ...args },
    play: async ({ canvas }) =>
      eachLayout(async () => {
        await expect(await canvas.findByText(title)).toBeVisible();

        if (message) await expect(canvas.getByText(message)).toBeVisible();
      }),
  };
}
