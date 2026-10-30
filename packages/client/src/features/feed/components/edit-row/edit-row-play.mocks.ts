import type { ToolCallUpdate } from '@repo/contracts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import type { EditRow } from './edit-row';

type Story = StoryObj<typeof EditRow>;

type Play = Parameters<NonNullable<Story['play']>>[0];

interface EditPlay {
  canvas: Play['canvas'];
  userEvent: Play['userEvent'];
  feed: ReturnType<typeof within>;
}

export type RecordedEdit = {
  row: ToolCallUpdate;
  // What the row's disclosure is called: the name a screen reader reads, counts and all (#1504).
  name: string;
  added: string | null;
  removed: string | null;
  line: string;
  summary: boolean;
};

const summaryName = /^Edited \d+ files/;

async function expectSummary(
  { feed, userEvent }: EditPlay,
  summary: boolean,
): Promise<void> {
  if (!summary) {
    await expect(feed.queryByRole('button', { name: summaryName })).toBeNull();

    return;
  }

  const summaryButton = feed.getByRole('button', { name: summaryName });
  await expect(summaryButton).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(summaryButton);
  await expect(within(summaryButton).queryByText(/[+−]\d+/u)).toBeNull();
}

const feedRight = (canvas: EditPlay['canvas']): number =>
  canvas.getByTestId('edit-feed').getBoundingClientRect().right;

async function expectInsideFeed(
  { canvas, feed }: EditPlay,
  button: HTMLElement,
): Promise<void> {
  await waitFor(async () => {
    const right = feedRight(canvas);
    const summaries = feed.queryAllByRole('button', { name: summaryName });

    for (const element of [button, ...summaries])
      await expect(element.getBoundingClientRect().right).toBeLessThan(right);
  });
}

async function expectCount(
  button: HTMLElement,
  count: string | null,
  absent: RegExp,
): Promise<void> {
  await (count === null
    ? expect(within(button).queryByText(absent)).toBeNull()
    : expect(within(button).getByText(count)).toBeVisible());
}

async function expectDiffToggles(
  { canvas, feed, userEvent }: EditPlay,
  button: HTMLElement,
  line: string,
): Promise<void> {
  await expect(feed.queryByTestId('diff-view')).toBeNull();
  await userEvent.click(button);
  await expect(await canvas.findByText(line)).toBeVisible();
  await expect(feed.getByTestId('diff-view')).toBeVisible();
  await expect(
    canvas.queryByRole('button', { name: 'Close Inspector' }),
  ).toBeNull();
  await userEvent.click(button);
  await waitFor(() => expect(feed.queryByTestId('diff-view')).toBeNull());
}

async function playEditRow(play: EditPlay, edit: RecordedEdit): Promise<void> {
  await expectSummary(play, edit.summary);
  const button = play.feed.getByRole('button', { name: edit.name });
  await expectInsideFeed(play, button);
  await expectCount(button, edit.added, /^\+\d+$/u);
  await expectCount(button, edit.removed, /^−\d+$/u);
  await expectDiffToggles(play, button, edit.line);
}

// One story per width, so an expanded summary or diff never carries into the next width.
export function editRow(width: number, edit: RecordedEdit): Story {
  return {
    args: { row: edit.row },
    play: async ({ canvas, userEvent }) => {
      if (process.env.NODE_ENV !== 'test') return;
      await settleLayout(width);
      const feed = within(canvas.getByTestId('edit-feed'));
      await playEditRow({ canvas, userEvent, feed }, edit);
    },
  };
}
