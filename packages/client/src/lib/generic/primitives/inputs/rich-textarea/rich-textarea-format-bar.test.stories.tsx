import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import {
  exampleLabel as label,
  RichTextareaExample,
} from './rich-textarea-example.mocks';

// The format bar in the web drawing (Lexical), selected with the browser's own mouse and keys.
const meta = {
  title: 'Tests/RichTextarea/FormatBar',
  component: RichTextareaExample,
  args: { onChangeText: fn(), onSubmit: fn() },
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
} satisfies Meta<typeof RichTextareaExample>;

export default meta;

type Story = StoryObj<typeof meta>;

const formatBar = { name: 'Format' };

const bold = 'Bold';

const italic = 'Italic';

const strikethrough = 'Strikethrough';

const code = 'Code';

const bulletedList = 'Bulleted list';

const numberedList = 'Numbered list';

const quote = 'Quote';

// A double click selects the word under the pointer, as a person selects with the mouse.
async function selectWordWithMouse(word: HTMLElement): Promise<HTMLElement> {
  await userEvent.dblClick(word);

  return within(document.body).findByRole('toolbar', formatBar);
}

const shownBar = (): HTMLElement | null =>
  within(document.body).queryByRole('toolbar', formatBar);

const buttonNames = (buttons: HTMLElement[]): (string | null)[] =>
  buttons.map((button) => button.getAttribute('aria-label'));

export const MouseSelectionShowsTheBar: Story = {
  args: { initialValue: 'Ship' },
  play: async ({ canvas }) => {
    const bar = within(await selectWordWithMouse(canvas.getByText('Ship')));
    await expect(buttonNames(bar.getAllByRole('button'))).toEqual([
      bold,
      italic,
      strikethrough,
      code,
      'Link',
      bulletedList,
      numberedList,
      quote,
    ]);
    // The bar fades in, so it is visible once its entrance ends.
    await waitFor(() =>
      expect(bar.getByRole('button', { name: quote })).toBeVisible(),
    );
  },
};

// The bar's absence is read once the browser has reported the keyboard's selection.
export const KeyboardSelectionShowsNoBar: Story = {
  args: { initialValue: 'Ship' },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('textbox', { name: label }));
    await userEvent.keyboard('{End}');

    const selected = new Promise((resolve) =>
      document.addEventListener('selectionchange', resolve, { once: true }),
    );

    await userEvent.keyboard('{Shift>}{Home}{/Shift}');
    await selected;
    await expect(shownBar()).not.toBeInTheDocument();
  },
};

// Each button sends what its shortcut or markdown would; on what the text already has, it takes it off.
function appliedByButton(
  button: string,
  sent: string,
  initialValue = 'Ship',
): Story {
  return {
    args: { initialValue },
    play: async ({ canvas, args }) => {
      const bar = within(await selectWordWithMouse(canvas.getByText('Ship')));
      await userEvent.click(bar.getByRole('button', { name: button }));
      await waitFor(() =>
        expect(args.onChangeText).toHaveBeenLastCalledWith(sent),
      );
    },
  };
}

export const BoldButton = appliedByButton(bold, '**Ship**');

export const ItalicButton = appliedByButton(italic, '_Ship_');

export const StrikethroughButton = appliedByButton(strikethrough, '~~Ship~~');

export const CodeButton = appliedByButton(code, '`Ship`');

export const BulletedListButton = appliedByButton(bulletedList, '- Ship');

export const NumberedListButton = appliedByButton(numberedList, '1. Ship');

export const QuoteButton = appliedByButton(quote, '> Ship');

export const BoldButtonOnBoldText = appliedByButton(bold, 'Ship', '**Ship**');

export const BulletedListButtonOnAList = appliedByButton(
  bulletedList,
  'Ship',
  '- Ship',
);

export const QuoteButtonOnAQuote = appliedByButton(quote, 'Ship', '> Ship');

// The link editor takes over from the bar.
export const LinkButtonOpensTheLinkEditor: Story = {
  args: { initialValue: 'Ship' },
  play: async ({ canvas }) => {
    const bar = within(await selectWordWithMouse(canvas.getByText('Ship')));
    await userEvent.click(bar.getByRole('button', { name: 'Link' }));

    const editor = within(
      await within(document.body).findByRole('dialog', { name: 'Edit link' }),
    );

    await expect(editor.getByRole('textbox', { name: 'Text' })).toHaveValue(
      'Ship',
    );
    await waitFor(() => expect(shownBar()).not.toBeInTheDocument());
  },
};

// What the selection already has shows pressed; the rest does not.
function pressedFor(initialValue: string, pressed: string[]): Story {
  return {
    args: { initialValue },
    play: async ({ canvas }) => {
      const bar = within(await selectWordWithMouse(canvas.getByText('Ship')));
      await expect(
        buttonNames(bar.getAllByRole('button', { pressed: true })),
      ).toEqual(pressed);
    },
  };
}

export const StackedMarksShowPressed = pressedFor('**_~~Ship~~_**', [
  bold,
  italic,
  strikethrough,
]);

export const CodeShowsPressed = pressedFor('`Ship`', [code]);

export const BulletedListShowsPressed = pressedFor('- Ship', [bulletedList]);

export const NumberedListShowsPressed = pressedFor('1. Ship', [numberedList]);

export const QuoteShowsPressed = pressedFor('> Ship', [quote]);
