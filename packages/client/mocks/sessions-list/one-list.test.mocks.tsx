import { eachLayout } from '@repo/kit/mocks/story-layout';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { SessionsList } from '../../src/features/sessions/components/sessions-list/sessions-list';
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

// Tall enough that the list draws every row at once, each with its meta line.
const everyRowHeight = 1800;

// One list: every Session in one run with no Project headings, each row showing how long ago it was active.
export const oneList: Story = {
  args: { view: { ...defaultSessionsView, group: 'none' } },
  render: (args) => (
    <View
      className="w-full wide:w-frame-list"
      style={{ height: everyRowHeight }}
    >
      <SessionsList {...args} />
    </View>
  ),
  play: async ({ canvas }) =>
    eachLayout(async () => {
      for (const session of sessionsListProps.sessions)
        await expect(
          (await canvas.findAllByText(session.title))[0],
        ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: exampleProjectName }),
      ).not.toBeInTheDocument();
      await expect(canvas.getAllByText(/^(now|\d+[mhdw])$/)).toHaveLength(
        sessionsListProps.sessions.length,
      );
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
  message?: string | RegExp,
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
