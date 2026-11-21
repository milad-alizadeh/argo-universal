import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { userEvent as pointer } from 'vitest/browser';
import { draftComments } from '../../stores/draft-comments';
import { issuesPage } from './draft-comment-fixtures';
import { CommentingPage } from './draft-comments-page.mocks';

const meta = {
  title: 'Tests/Plugins/DraftComments',
  component: CommentingPage,
  args: { commenting: true },
} satisfies Meta<typeof CommentingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// The editor opens in a portal, outside the story's canvas.
const editor = (): ReturnType<typeof within> => within(document.body);

const pairing = 'Pairing code expires';

// Presses a node the way a phone's long press does: the button held down, then let go.
async function holdOn(
  element: HTMLElement,
  milliseconds: number,
): Promise<void> {
  const { left, top } = element.getBoundingClientRect();
  const at = { bubbles: true, clientX: left + 4, clientY: top + 4 };

  element.dispatchEvent(new MouseEvent('mousedown', at));
  await new Promise((done) => setTimeout(done, milliseconds));
  element.dispatchEvent(new MouseEvent('mouseup', at));
}

// A pointer press on a row picks the row, inside the list region, and the note is saved with its place.
export const APointerPressPicksTheNodeUnderIt: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await pointer.click(await canvas.findByText(pairing));
    await settleOverlays();

    const note = await editor().findByRole('textbox', { name: 'Comment' });

    await expect(await editor().findByText('List · A · row-409')).toBeVisible();
    await userEvent.type(note, 'Use a coloured chip');
    await userEvent.click(editor().getByRole('button', { name: 'Comment' }));

    await waitFor(() =>
      expect(draftComments.of(issuesPage).notes).toEqual([
        {
          address: expect.stringContaining('row-409'),
          nodeKey: 'row-409',
          region: 'list',
          variant: 'rows',
          note: 'Use a coloured chip',
        },
      ]),
    );
    await expect(
      await canvas.findByRole('img', { name: '1 comment' }),
    ).toBeVisible();
  },
};

// A node outside every region is named by its key alone and carries no region.
export const ANodeOutsideEveryRegionNamesNoRegion: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await pointer.click(await canvas.findByText('Issues'));
    await settleOverlays();

    await expect(await editor().findByText('title')).toBeVisible();
    await userEvent.type(
      await editor().findByRole('textbox', { name: 'Comment' }),
      'Bigger',
    );
    await userEvent.click(editor().getByRole('button', { name: 'Comment' }));

    await waitFor(() =>
      expect(draftComments.of(issuesPage).notes).toEqual([
        expect.objectContaining({ nodeKey: 'title', note: 'Bigger' }),
      ]),
    );
    await expect(draftComments.of(issuesPage).notes[0]).not.toHaveProperty(
      'region',
    );
  },
};

// Comment mode does not run what the press lands on, so a row's own press never fires and the list still draws its rows.
export const CommentModeDrawsEveryNodeAndRunsNone: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(pairing)).toBeVisible();
    await expect(canvas.getByText('Composer drops a draft')).toBeVisible();
    await expect(canvas.getByText('Open')).toBeVisible();
  },
};

// Outside comment mode a press picks nothing.
export const NothingIsPickedOutsideCommentMode: Story = {
  args: { commenting: false },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await pointer.click(await canvas.findByText(pairing));

    await expect(
      editor().queryByRole('textbox', { name: 'Comment' }),
    ).toBeNull();
  },
};

// Cancel closes the editor and leaves no note.
export const CancelLeavesNoNote: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await pointer.click(await canvas.findByText(pairing));
    await settleOverlays();
    await userEvent.type(
      await editor().findByRole('textbox', { name: 'Comment' }),
      'Never mind',
    );
    await userEvent.click(editor().getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(editor().queryByRole('textbox', { name: 'Comment' })).toBeNull(),
    );
    await expect(draftComments.of(issuesPage).notes).toEqual([]);
  },
};

// A phone picks only on a long press: a tap does nothing, and holding opens the sheet.
export const APhonePicksOnALongPress: Story = {
  args: { longPressMilliseconds: 60 },
  play: async ({ canvas }) => {
    await settleLayout('phone');

    const row = await canvas.findByText(pairing);

    await holdOn(row, 0);
    await expect(
      editor().queryByRole('textbox', { name: 'Comment' }),
    ).toBeNull();

    await holdOn(row, 120);
    await expect(
      await editor().findByText('Long-pressed · List · A · row-409'),
    ).toBeVisible();
    await expect(
      await editor().findByRole('textbox', { name: 'Comment' }),
    ).toBeVisible();
  },
};
