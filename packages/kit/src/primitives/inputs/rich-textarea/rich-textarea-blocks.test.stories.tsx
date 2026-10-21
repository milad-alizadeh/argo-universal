import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { shownText } from '../../../../mocks/shown-text';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import {
  exampleLabel as label,
  RichTextareaExample,
  shortcutModifier as modifier,
} from './rich-textarea-example.mocks';

// Lists, quotes and code blocks in the web drawing (Lexical), typed through the browser.

const meta = {
  title: 'Tests/RichTextareaBlocks',
  component: RichTextareaExample,
  args: { onChangeText: fn(), onSubmit: fn() },
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
} satisfies Meta<typeof RichTextareaExample>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * A block shortcut and the keys inside the block: the field sends markdown and does not submit.
 * innerText puts a blank line around a paragraph next to another block.
 */
interface TypedBlock {
  typed: string;
  sent: string;
  shown: string;
}

function typedBlock({ typed, sent, shown }: TypedBlock): Story {
  return {
    play: async ({ canvas, args }) => {
      const field = canvas.getByRole('textbox', { name: label });
      await userEvent.type(field, typed);
      await waitFor(() =>
        expect(args.onChangeText).toHaveBeenLastCalledWith(sent),
      );
      await expect(shownText(field)).toBe(shown);
      await expect(args.onSubmit).not.toHaveBeenCalled();
    },
  };
}

const twoItems = 'First\nSecond';

export const TypedBulletedList = typedBlock({
  typed: '- First{Enter}Second',
  sent: '- First\n- Second',
  shown: twoItems,
});

export const TypedStarBulletedList = typedBlock({
  typed: '* First{Enter}Second',
  sent: '* First\n* Second',
  shown: twoItems,
});

export const TypedNumberedList = typedBlock({
  typed: '1. First{Enter}Second',
  sent: '1. First\n2. Second',
  shown: twoItems,
});

export const ReturnOnAnEmptyItemLeavesTheList = typedBlock({
  typed: '- First{Enter}{Enter}After',
  sent: '- First\n\nAfter',
  shown: 'First\n\nAfter',
});

export const TabNestsAndShiftTabUnnests = typedBlock({
  typed: '- Plan{Enter}{Tab}Draft{Enter}{Shift>}{Tab}{/Shift}Ship',
  sent: '- Plan\n    - Draft\n- Ship',
  shown: 'Plan\nDraft\nShip',
});

/*
 * The item becomes plain text and keeps its text. Lexical reads a caret move from the browser's
 * selectionchange event, so Backspace waits for that event after the last move.
 */
export const BackspaceAtAnItemStartLeavesTheList: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, '- Plain');
    await userEvent.keyboard('{ArrowLeft}'.repeat(4));

    const caretMoved = new Promise((resolve) =>
      document.addEventListener('selectionchange', resolve, { once: true }),
    );

    await userEvent.keyboard('{ArrowLeft}');
    await caretMoved;
    await userEvent.keyboard('{Backspace}');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('Plain'),
    );
    await expect(canvas.queryByRole('list')).not.toBeInTheDocument();
  },
};

export const TypedQuote = typedBlock({
  typed: '> Keep it readable',
  sent: '> Keep it readable',
  shown: 'Keep it readable',
});

export const TypedCodeBlock = typedBlock({
  typed: '``` const a = 1;{Enter}const b = 2;',
  sent: '```\nconst a = 1;\nconst b = 2;\n```',
  shown: 'const a = 1;\nconst b = 2;',
});

export const ThreeReturnsLeaveTheCodeBlock = typedBlock({
  typed: '``` pnpm test{Enter}{Enter}{Enter}After',
  sent: '```\npnpm test\n```\n\nAfter',
  shown: 'pnpm test\n\nAfter',
});

export const ReturnInAQuoteSends: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, '> Ship it{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onChangeText).toHaveBeenLastCalledWith('> Ship it');
  },
};

// ⌘⇧C moves a selection into a code block, or turns the caret's line into one.
function shortcutCodeBlock(selectFirst: boolean): Story {
  return {
    play: async ({ canvas, args }) => {
      const field = canvas.getByRole('textbox', { name: label });
      await userEvent.type(field, 'pnpm test');

      if (selectFirst)
        await userEvent.keyboard(`{${modifier}>}a{/${modifier}}`);
      await userEvent.keyboard(`{${modifier}>}{Shift>}c{/Shift}{/${modifier}}`);
      await waitFor(() =>
        expect(args.onChangeText).toHaveBeenLastCalledWith(
          '```\npnpm test\n```',
        ),
      );
      await expect(shownText(field)).toBe('pnpm test');
    },
  };
}

export const ShortcutCodeBlock = shortcutCodeBlock(true);

export const ShortcutCodeBlockAtTheCaret = shortcutCodeBlock(false);
