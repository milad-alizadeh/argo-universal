/// <reference types="@vitest/browser-playwright" />
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { cdp, userEvent } from 'vitest/browser';
import {
  type PastedHtml,
  pastedHtml,
} from '../../../../../../mocks/rich-textarea-paste-mock';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import {
  exampleLabel as label,
  RichTextareaExample,
  shortcutModifier as modifier,
} from './rich-textarea-example.mocks';

// Pasting into the web drawing (Lexical): HTML keeps what markdown can express, ⌘⇧V pastes plain text.
const meta = {
  title: 'Tests/RichTextarea/Paste',
  component: RichTextareaExample,
  args: { onChangeText: fn(), onSubmit: fn() },
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
} satisfies Meta<typeof RichTextareaExample>;

export default meta;

type Story = StoryObj<typeof meta>;

// The paste event a browser fires with the source's clipboard, so each fixture reaches the editor as written.
function pasteEvent({ html, plain }: PastedHtml): ClipboardEvent {
  const clipboardData = new DataTransfer();
  clipboardData.setData('text/html', html);
  clipboardData.setData('text/plain', plain);

  return new ClipboardEvent('paste', {
    clipboardData,
    bubbles: true,
    cancelable: true,
  });
}

async function pasteInto(
  field: HTMLElement,
  pasted: PastedHtml,
): Promise<void> {
  await userEvent.click(field);
  field.dispatchEvent(pasteEvent(pasted));
}

function pastedFrom(pasted: PastedHtml): Story {
  return {
    play: async ({ canvas, args }) => {
      await pasteInto(canvas.getByRole('textbox', { name: label }), pasted);
      await waitFor(() =>
        expect(args.onChangeText).toHaveBeenLastCalledWith(pasted.sent),
      );
    },
  };
}

export const PastedFromAWebPage = pastedFrom(pastedHtml.webPage);

export const PastedFromGoogleDocs = pastedFrom(pastedHtml.googleDocs);

export const PastedFromNotion = pastedFrom(pastedHtml.notion);

export const PastedFromVsCode = pastedFrom(pastedHtml.vsCode);

export const PastedScriptLinkIsPlainText = pastedFrom(pastedHtml.scriptLink);

export const PastedFromWikipedia = pastedFrom(pastedHtml.wikipedia);

// A pasted external link opens as Argo opens any link, not in the new tab its source page asked for.
export const PastedLinkDropsItsTarget: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await pasteInto(field, pastedHtml.wikipedia);
    await waitFor(() => expect(args.onChangeText).toHaveBeenCalled());
    const link = canvas.getByRole('link', { name: 'original syntax' });
    await expect(link).not.toHaveAttribute('target');
    await expect(link).not.toHaveAttribute('rel');
  },
};

// Colours, fonts, alignment, highlight, subscript and superscript do not show in the field.
function pastedStylingDropped(pasted: PastedHtml): Story {
  return {
    play: async ({ canvas, args }) => {
      const field = canvas.getByRole('textbox', { name: label });
      await pasteInto(field, pasted);
      await waitFor(() => expect(args.onChangeText).toHaveBeenCalled());
      await expect(
        field.querySelectorAll('[style], mark, sub, sup'),
      ).toHaveLength(0);
    },
  };
}

export const StylingFromAWebPageIsDropped = pastedStylingDropped(
  pastedHtml.webPage,
);

export const StylingFromGoogleDocsIsDropped = pastedStylingDropped(
  pastedHtml.googleDocs,
);

// A page's heading and a paragraph with marks, a link and an underline, copied as a person copies them.
const copiedPage =
  '<h2>Plan</h2><p><strong>Ship</strong> <u>today</u> with <a href="https://argo.dev/plan">the plan</a></p>';

// Selects the rendered HTML and copies it, so the clipboard holds the browser's own text/html.
async function copyPage(html: string): Promise<void> {
  const source = document.createElement('div');
  source.innerHTML = html;
  document.body.append(source);
  const range = document.createRange();
  range.selectNodeContents(source);
  window.getSelection()?.removeAllRanges();
  window.getSelection()?.addRange(range);
  await userEvent.copy();
  source.remove();
}

export const PastingCopiedHtmlKeepsMarkdownMarks: Story = {
  play: async ({ canvas, args }) => {
    await copyPage(copiedPage);
    await userEvent.click(canvas.getByRole('textbox', { name: label }));
    await userEvent.paste();
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith(
        '## Plan\n\n**Ship** today with [the plan](https://argo.dev/plan)',
      ),
    );
  },
};

/*
 * ⌘⇧V (Ctrl+Shift+V off Apple platforms) is the browser's Paste and Match Style. Chromium binds
 * Ctrl+Shift+V itself, but headless Chromium binds nothing on macOS, so there the key carries the
 * command a browser's binding gives it; sending it on both would paste twice.
 */
const cdpModifier = { Control: 2, Meta: 4, Shift: 8 } as const;

const plainPasteKey = {
  key: 'V',
  code: 'KeyV',
  windowsVirtualKeyCode: 'V'.codePointAt(0),
  modifiers: cdpModifier[modifier] | cdpModifier.Shift,
};

async function pressPlainPaste(): Promise<void> {
  const session = cdp();
  await session.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    ...plainPasteKey,
    commands: modifier === 'Meta' ? ['pasteAndMatchStyle'] : [],
  });
  await session.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    ...plainPasteKey,
  });
}

export const ShiftPastePastesPlainText: Story = {
  play: async ({ canvas, args }) => {
    await copyPage(copiedPage);
    await userEvent.click(canvas.getByRole('textbox', { name: label }));
    await pressPlainPaste();
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith(
        'Plan\n\nShip today with the plan',
      ),
    );
  },
};
