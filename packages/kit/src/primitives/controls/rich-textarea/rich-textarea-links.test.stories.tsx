import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { settleLayout } from '#mocks/story-layout';
import { shownText } from '../../../../mocks/shown-text';
import {
  exampleLabel as label,
  RichTextareaExample,
  shortcutModifier as modifier,
} from './rich-textarea-example.mocks';

// Links in the web drawing (Lexical), typed through the browser.
const meta = {
  title: 'Tests/Design System/Primitives/Controls/RichTextarea/Links',
  component: RichTextareaExample,
  args: { onChangeText: fn(), onSubmit: fn() },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide');
  },
} satisfies Meta<typeof RichTextareaExample>;

export default meta;

type Story = StoryObj<typeof meta>;

// The draft is "Read the spec" with "spec" selected from the keyboard.
const draft = 'Read the spec';

const url = 'https://argo.dev/spec';

async function selectLastWord(field: HTMLElement): Promise<void> {
  await userEvent.click(field);
  await userEvent.keyboard(
    '{End}{Shift>}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{/Shift}',
  );
}

async function openLinkEditor(field: HTMLElement): Promise<HTMLElement> {
  await selectLastWord(field);
  await userEvent.keyboard(`{${modifier}>}k{/${modifier}}`);

  return within(document.body).findByRole('dialog', { name: 'Edit link' });
}

export const LinkEditorOpen: Story = {
  args: { initialValue: draft },
  play: async ({ canvas }) => {
    const editor = within(
      await openLinkEditor(canvas.getByRole('textbox', { name: label })),
    );

    await expect(editor.getByRole('textbox', { name: 'Text' })).toHaveValue(
      'spec',
    );
    await expect(editor.getByRole('textbox', { name: 'Link' })).toHaveFocus();
    // The popover fades in, so it is visible once its entrance ends.
    await waitFor(() =>
      expect(editor.getByRole('button', { name: 'Save' })).toBeVisible(),
    );
  },
};

// Return saves the typed link, whether a URL or a link within the page.
function linkEditorSaves(typedUrl: string): Story {
  return {
    args: { initialValue: draft },
    play: async ({ canvas, args }) => {
      const field = canvas.getByRole('textbox', { name: label });
      await openLinkEditor(field);
      await userEvent.keyboard(`${typedUrl}{Enter}`);
      await waitFor(() =>
        expect(args.onChangeText).toHaveBeenLastCalledWith(
          `Read the [spec](${typedUrl})`,
        ),
      );
      await expect(
        within(field).getByRole('link', { name: 'spec' }),
      ).toHaveAttribute('href', typedUrl);
      await waitFor(() =>
        expect(
          within(document.body).queryByRole('dialog', { name: 'Edit link' }),
        ).not.toBeInTheDocument(),
      );
      await expect(args.onSubmit).not.toHaveBeenCalled();
    },
  };
}

export const LinkEditorReturnSaves = linkEditorSaves(url);

export const LinkEditorSavesARelativeLink = linkEditorSaves('#top');

// A script URL would run when the link is followed, so the editor saves nothing.
export const LinkEditorRefusesAScriptUrl: Story = {
  args: { initialValue: draft },
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await openLinkEditor(field);
    await userEvent.keyboard(' JavaScript:alert(1){Enter}');
    await waitFor(() =>
      expect(
        within(document.body).queryByRole('dialog', { name: 'Edit link' }),
      ).not.toBeInTheDocument(),
    );
    await expect(within(field).queryByRole('link')).not.toBeInTheDocument();
    await expect(args.onChangeText).not.toHaveBeenCalled();
  },
};

export const LinkEditorEscapeCancels: Story = {
  args: { initialValue: draft },
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await openLinkEditor(field);
    await userEvent.keyboard(`${url}{Escape}`);
    await waitFor(() =>
      expect(
        within(document.body).queryByRole('dialog', { name: 'Edit link' }),
      ).not.toBeInTheDocument(),
    );
    await expect(within(field).queryByRole('link')).not.toBeInTheDocument();
    await expect(args.onChangeText).not.toHaveBeenCalled();
  },
};

// Copies text through a scratch input, so the paste comes from the clipboard.
async function copyText(text: string): Promise<void> {
  const source = document.createElement('input');
  source.value = text;
  document.body.append(source);
  source.select();
  await userEvent.copy();
  source.remove();
}

export const PastingAUrlOverASelectionLinksIt: Story = {
  args: { initialValue: draft },
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await copyText(url);
    await selectLastWord(field);
    await userEvent.paste();
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith(
        `Read the [spec](${url})`,
      ),
    );
    await expect(
      within(field).getByRole('link', { name: 'spec' }),
    ).toHaveAttribute('href', url);
    await expect(shownText(field)).toBe(draft);
  },
};

export const TypedUrlLinksItselfOnSpace: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    const typedUrl = 'https://ci.argo.dev/runs/8812';
    await userEvent.type(field, `Logs: ${typedUrl}`);
    await expect(within(field).queryByRole('link')).not.toBeInTheDocument();
    await userEvent.keyboard(' ');
    await expect(
      await within(field).findByRole('link', { name: typedUrl }),
    ).toHaveAttribute('href', typedUrl);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith(`Logs: ${typedUrl} `),
    );
  },
};
