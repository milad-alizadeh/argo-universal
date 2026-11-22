import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { userEvent as pointer } from 'vitest/browser';
import { draftComments } from '../../stores/draft-comments';
import {
  fieldRowTree,
  issuesPage,
  longListTree,
} from './draft-comment-fixtures';
import {
  CommentingPage,
  holdOn,
  TogglingPage,
} from './draft-comments-page.mocks';

const meta = {
  title: 'Tests/Plugins/DraftComments/Layer',
  component: CommentingPage,
  args: { commenting: true },
} satisfies Meta<typeof CommentingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// The editor opens in a portal, outside the story's canvas.
const editor = (): ReturnType<typeof within> => within(document.body);

const nameField = { name: 'Name' } as const;

const stopCommenting = { name: 'Stop commenting' } as const;

const commentMode = { name: 'Comment mode' } as const;

const pairing = 'Pairing code expires';

export const APointerPressPicksTheNodeUnderIt: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await pointer.click(await canvas.findByText(pairing));
    await settleOverlays();

    const note = await editor().findByRole('textbox', { name: 'Comment' });

    const heading = await editor().findByText('List · rows');

    await waitFor(() => expect(heading).toBeVisible());
    await expect(
      editor().getByRole('group', { name: 'List · A · row-409' }),
    ).toBeVisible();
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

export const ANodeOutsideEveryRegionNamesNoRegion: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await pointer.click(await canvas.findByText('Issues'));
    await settleOverlays();

    const named = await editor().findByRole('group', { name: 'title' });

    await waitFor(() =>
      expect(within(named).getByText('Issues')).toBeVisible(),
    );
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

export const CommentModeRunsNoNode: Story = {
  args: { onPageCall: fn() },
  play: async ({ args, canvas }) => {
    await settleLayout('wide');
    await expect(canvas.getByText('Composer drops a draft')).toBeVisible();
    await expect(canvas.getByText('Open')).toBeVisible();
    await pointer.click(await canvas.findByText(pairing));
    await settleOverlays();

    await expect(args.onPageCall).not.toHaveBeenCalled();
  },
};

export const OutsideCommentModeAPressRunsTheNode: Story = {
  args: { commenting: false, onPageCall: fn() },
  play: async ({ args, canvas }) => {
    await settleLayout('wide');
    await pointer.click(await canvas.findByText(pairing));

    await waitFor(() => expect(args.onPageCall).toHaveBeenCalledTimes(1));
  },
};

export const CommentModeBlocksKeyboardActivation: Story = {
  args: { onPageCall: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await settleLayout('wide');

    const row = (await canvas.findByText(pairing)).closest<HTMLElement>(
      '[tabindex]',
    );

    row?.focus();
    await userEvent.keyboard('{Enter}');
    await settleOverlays();

    await expect(args.onPageCall).not.toHaveBeenCalled();
  },
};

export const NothingIsPickedOutsideCommentMode: Story = {
  args: { commenting: false },
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await pointer.click(await canvas.findByText(pairing));
    await settleOverlays();

    await expect(
      editor().queryByRole('textbox', { name: 'Comment' }),
    ).toBeNull();
  },
};

export const AMovingPressPicksNothing: Story = {
  args: { longPressMilliseconds: 0 },
  play: async ({ canvas }) => {
    await settleLayout('wide');

    const row = await canvas.findByText(pairing);

    const { left, top } = row.getBoundingClientRect();

    const at = (x: number): MouseEventInit => ({
      bubbles: true,
      clientX: left + x,
      clientY: top + 4,
    });

    row.dispatchEvent(new MouseEvent('mousedown', at(4)));
    row.dispatchEvent(new MouseEvent('mousemove', at(60)));
    row.dispatchEvent(new MouseEvent('mouseup', at(60)));
    await settleOverlays();

    await expect(
      editor().queryByRole('textbox', { name: 'Comment' }),
    ).toBeNull();
  },
};

export const TypedTextSurvivesTheToggle: Story = {
  render: () => <TogglingPage root={fieldRowTree} regions={false} />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');

    const field = await canvas.findByRole('textbox', nameField);

    await userEvent.type(field, 'Ada');
    await userEvent.click(canvas.getByRole('button', commentMode));
    await canvas.findByRole('button', stopCommenting);

    const after = canvas.getByRole('textbox', nameField);

    await expect(after).toBe(field);
    await expect(after).toHaveValue('Ada');
  },
};

const boxOf = (element: HTMLElement): string => {
  const { left, top, width, height } = element.getBoundingClientRect();

  return [left, top, width, height].join(',');
};

export const CommentModeKeepsAFieldFillingItsRow: Story = {
  render: () => <TogglingPage root={fieldRowTree} regions={false} />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');

    const field = await canvas.findByRole('textbox', nameField);
    const before = boxOf(field);

    await userEvent.click(canvas.getByRole('button', commentMode));
    await canvas.findByRole('button', stopCommenting);

    await expect(boxOf(canvas.getByRole('textbox', nameField))).toBe(before);
  },
};

export const CommentModeKeepsAListFillingAndScrolling: Story = {
  render: () => <TogglingPage root={longListTree} regions={false} />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');

    const first = await canvas.findByText('Issue 0');
    const before = boxOf(first);

    await userEvent.click(canvas.getByRole('button', commentMode));
    await canvas.findByRole('button', stopCommenting);

    await expect(boxOf(canvas.getByText('Issue 0'))).toBe(before);
    await expect(canvas.queryByText('Issue 29')).toBeNull();
  },
};

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

export const APhonePicksOnALongPress: Story = {
  args: { longPressMilliseconds: 60 },
  play: async ({ canvas }) => {
    await settleLayout('phone');

    const row = await canvas.findByText(pairing);

    await holdOn(row, 0);
    await settleOverlays();
    await expect(
      editor().queryByRole('textbox', { name: 'Comment' }),
    ).toBeNull();

    await holdOn(row, 120);
    await expect(await editor().findByText('List · rows')).toBeVisible();
    await expect(editor().queryByText(/Long-pressed/)).toBeNull();
    await expect(
      await editor().findByRole('textbox', { name: 'Comment' }),
    ).toBeVisible();
  },
};
