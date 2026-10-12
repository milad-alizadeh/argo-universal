import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import {
  RichTextareaExample,
  shownText,
} from '../../../../../../mocks/rich-textarea-example';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';

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

const label = 'Message';
// Lexical binds its shortcuts to ⌘ on Apple platforms and Ctrl elsewhere.
const modifier = /Mac|iPhone|iPad/.test(navigator.platform)
  ? 'Meta'
  : 'Control';

/*
 * A block shortcut and the keys inside the block: the field sends markdown and does not submit.
 * innerText puts a blank line around a paragraph next to another block.
 */
function typedBlock({
  typed,
  sent,
  shown,
}: {
  typed: string;
  sent: string;
  shown: string;
}): Story {
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
export const BackspaceAtAnItemStartLeavesTheList = typedBlock({
  typed: '- {Backspace}Plain',
  sent: 'Plain',
  shown: 'Plain',
});
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

export const ShortcutCodeBlock: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, 'pnpm test');
    await userEvent.keyboard(`{${modifier}>}a{/${modifier}}`);
    await userEvent.keyboard(`{${modifier}>}{Shift>}c{/Shift}{/${modifier}}`);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('```\npnpm test\n```'),
    );
    await expect(shownText(field)).toBe('pnpm test');
  },
};

// A restored draft draws its blocks, nested lists included, without sending a change.
export const ShowsNestedLists: Story = {
  args: {
    initialValue:
      '- Plan\n    - Draft\n        - Outline\n- Ship\n\n1. Build\n    1. Test\n2. Release',
  },
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await expect(canvas.getAllByRole('list')).toHaveLength(5);
    await expect(shownText(field)).toBe(
      'Plan\nDraft\nOutline\nShip\nBuild\nTest\nRelease',
    );
    await expect(args.onChangeText).not.toHaveBeenCalled();
  },
};

export const ShowsAQuote: Story = {
  args: { initialValue: '> Keep the phone readable.\n> Use both themes.' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('blockquote')).toHaveTextContent(
      'Keep the phone readable.Use both themes.',
    );
  },
};

export const ShowsACodeBlock: Story = {
  args: { initialValue: '```ts\nconst snake_case = 2 * 3;\n```' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('code')).toHaveTextContent(
      'const snake_case = 2 * 3;',
    );
  },
};
