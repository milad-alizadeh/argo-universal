import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import {
  exampleLabel as label,
  RichTextareaExample,
  shortcutModifier as modifier,
  shownText,
} from '../../../../../../mocks/rich-textarea-example';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';

// These stories cover the web drawing (Lexical) only; the phone drawing is checked in the app.

const meta = {
  title: 'Tests/RichTextarea',
  component: RichTextareaExample,
  args: { onChangeText: fn(), onSubmit: fn() },
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
} satisfies Meta<typeof RichTextareaExample>;
export default meta;
type Story = StoryObj<typeof meta>;

// Lexical edits from real key events, so these stories type through the browser, not simulated events.

export const Empty: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await expect(shownText(field)).toBe('');
    await expect(canvas.getByText('Message the Agent…')).toBeVisible();
  },
};

// The mark is in what the field sends while its markers are gone from what it shows.
function typedMark({
  typed,
  sent = typed,
}: {
  typed: string;
  sent?: string;
}): Story {
  return {
    play: async ({ canvas, args }) => {
      const field = canvas.getByRole('textbox', { name: label });
      await userEvent.type(field, typed);
      await waitFor(() =>
        expect(args.onChangeText).toHaveBeenLastCalledWith(sent),
      );
      await expect(shownText(field)).toBe('Ship it');
    },
  };
}
export const TypedBold = typedMark({ typed: '**Ship** it' });
export const TypedItalic = typedMark({ typed: '_Ship_ it' });
export const TypedStrikethrough = typedMark({
  typed: '~Ship~ it',
  sent: '~~Ship~~ it',
});
export const TypedDoubleTildeStrikethrough = typedMark({
  typed: '~~Ship~~ it',
});
export const TypedInlineCode = typedMark({ typed: '`Ship` it' });
// Lexical's other spellings work as typed and are sent in the Feed's spelling.
export const TypedStarItalic = typedMark({
  typed: '*Ship* it',
  sent: '_Ship_ it',
});
export const TypedUnderscoreBold = typedMark({
  typed: '__Ship__ it',
  sent: '**Ship** it',
});
export const TypedStarBoldItalic = typedMark({
  typed: '***Ship*** it',
  sent: '**_Ship_** it',
});

// `#` is reserved for references, so typing it makes no heading.
export const HashStaysTextAndMakesNoHeading: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, '## Plan');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('## Plan'),
    );
    await expect(canvas.queryByRole('heading')).not.toBeInTheDocument();
  },
};

function shortcutMark({ keys, sent }: { keys: string; sent: string }): Story {
  return {
    play: async ({ canvas, args }) => {
      const field = canvas.getByRole('textbox', { name: label });
      await userEvent.type(field, 'Ship');
      await userEvent.keyboard(`{${modifier}>}a{/${modifier}}`);
      await userEvent.keyboard(`{${modifier}>}${keys}{/${modifier}}`);
      await waitFor(() =>
        expect(args.onChangeText).toHaveBeenLastCalledWith(sent),
      );
      await expect(shownText(field)).toBe('Ship');
    },
  };
}
export const ShortcutBold = shortcutMark({ keys: 'b', sent: '**Ship**' });
export const ShortcutItalic = shortcutMark({ keys: 'i', sent: '_Ship_' });
export const ShortcutStrikethrough = shortcutMark({
  keys: '{Shift>}x{/Shift}',
  sent: '~~Ship~~',
});
export const ShortcutInlineCode = shortcutMark({ keys: 'e', sent: '`Ship`' });

export const ReturnSends: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, 'Ship it{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onChangeText).toHaveBeenLastCalledWith('Ship it');
  },
};

export const ShiftReturnAddsALine: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, 'Ship{Shift>}{Enter}{/Shift}it');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('Ship\nit'),
    );
    await expect(shownText(field)).toBe('Ship\nit');
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

// Drawing a draft that arrives from outside is not an edit, so nothing is sent back.
export const ShowingADraftDoesNotChangeIt: Story = {
  args: { initialValue: '**Ship** _it_' },
  play: async ({ canvas, args }) => {
    await expect(shownText(canvas.getByRole('textbox', { name: label }))).toBe(
      'Ship it',
    );
    await expect(args.onChangeText).not.toHaveBeenCalled();
  },
};
