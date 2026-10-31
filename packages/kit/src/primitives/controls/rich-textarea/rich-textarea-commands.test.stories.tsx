import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { settleLayout } from '#mocks/story-layout';
import {
  exampleLabel as label,
  RichTextareaExample,
} from './rich-textarea-example.mocks';
import type { SuggestionSource } from './rich-textarea-suggestions';

/*
 * A Slash command the editor knows is a token, and the draft's text stays what was typed. A token
 * is proved by how it deletes: one Backspace takes the whole command, where plain text loses a letter.
 */

const hintText = 'a branch';

const reviewName = 'review';

const initName = 'init';

const withArgument = '/review main';

// A space, then what stands before it: a whole token, or one letter of plain text.
const backspaceTwice = '{Backspace}{Backspace}';

const commands = [
  { name: reviewName, description: 'Review the changes', hint: hintText },
  { name: initName, description: 'Set up the project' },
];

const source: SuggestionSource = {
  id: 'commands',
  title: 'Commands',
  query: (query) =>
    commands.flatMap(({ name, description }) =>
      name.startsWith(query)
        ? [
            {
              id: name,
              label: `/${name}`,
              detail: description,
              insert: `/${name} `,
              command: name,
            },
          ]
        : [],
    ),
  commands: commands.map(({ name, hint }) => ({ name, hint })),
};

// A Plugin result that happens to insert `/plan `: it is text, not a Slash command.
const pluginSource: SuggestionSource = {
  id: 'plugin',
  title: 'Plugin',
  query: (query) =>
    'plan'.startsWith(query)
      ? [{ id: 'plan', label: 'Plan', insert: '/plan ' }]
      : [],
};

// A result that names a command its source does not list: it is text, as a typed `/ghost` would be.
const unlistedSource: SuggestionSource = {
  id: 'unlisted',
  title: 'Unlisted',
  query: (query) =>
    'ghost'.startsWith(query)
      ? [{ id: 'ghost', label: '/ghost', insert: '/ghost ', command: 'ghost' }]
      : [],
};

// Enter chooses the highlighted suggestion and is spent if none exists yet, so wait for its row
// (the list is portalled outside the canvas, hence document.body).
const chooseSuggestion = async (
  field: HTMLElement,
  typed: string,
  option: RegExp,
): Promise<void> => {
  await userEvent.type(field, typed);
  await within(document.body).findByRole('option', { name: option });
  await userEvent.keyboard('{Enter}');
};

const meta = {
  title: 'Tests/Design System/Primitives/Controls/RichTextarea/Commands',
  component: RichTextareaExample,
  args: { onChangeText: fn(), onSubmit: fn(), suggestions: [source] },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide');
  },
} satisfies Meta<typeof RichTextareaExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AChosenCommandIsATokenAndTheTextIsNameAndSpace: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await chooseSuggestion(field, '/rev', /review/);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/review '),
    );
    await userEvent.keyboard(backspaceTwice);
    await waitFor(() => expect(args.onChangeText).toHaveBeenLastCalledWith(''));
  },
};

export const ATypedKnownCommandBecomesAToken: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, 'Then /init ');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('Then /init '),
    );
    await userEvent.keyboard(backspaceTwice);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('Then '),
    );
  },
};

export const AnUnknownCommandStaysPlainText: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, '/nothing ');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/nothing '),
    );
    await userEvent.keyboard(backspaceTwice);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/nothin'),
    );
  },
};

export const APathStaysPlainText: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, 'src/init ');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('src/init '),
    );
    await userEvent.keyboard(backspaceTwice);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('src/ini'),
    );
  },
};

export const ARestoredDraftRebuildsTheTokenAndKeepsItsText: Story = {
  args: { initialValue: `/${reviewName} ` },
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await expect(field).toHaveTextContent(`/${reviewName}`);
    await userEvent.click(field);
    await userEvent.keyboard('{End}x');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith(`/${reviewName} x`),
    );
    await userEvent.keyboard('{Backspace}{Backspace}{Backspace}');
    await waitFor(() => expect(args.onChangeText).toHaveBeenLastCalledWith(''));
  },
};

export const TheHintShowsAfterTheCommandUntilAnArgumentIsTyped: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await chooseSuggestion(field, '/rev', /review/);
    await waitFor(() =>
      expect(field).toHaveTextContent(`/${reviewName}${hintText}`),
    );
    await userEvent.keyboard('main');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith(withArgument),
    );
    await waitFor(() =>
      expect(within(field).queryByText(hintText)).not.toBeInTheDocument(),
    );
  },
};

export const APastedKnownCommandBecomesAToken: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.click(field);
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', `/${initName}`);
    field.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith(`/${initName}`),
    );
    await userEvent.keyboard('{Backspace}');
    await waitFor(() => expect(args.onChangeText).toHaveBeenLastCalledWith(''));
  },
};

export const ACommandWithoutAHintShowsNone: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await chooseSuggestion(field, '/ini', /init/);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/init '),
    );
    await expect(within(field).queryByText(hintText)).not.toBeInTheDocument();
  },
};

// The last letter and Enter arrive before the editor has told the menu about that letter.
export const EnterRightAfterTheLastLetterAcceptsTheWholeCommand: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, '/in');
    await waitFor(() =>
      expect(
        within(document.body).getByRole('option', { name: /init/ }),
      ).toBeVisible(),
    );
    document.execCommand('insertText', false, 'i');
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/init '),
    );
  },
};

export const APluginResultThatInsertsSlashNameStaysPlainText: Story = {
  args: { suggestions: [source, pluginSource] },
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await chooseSuggestion(field, '/pla', /plan/i);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/plan '),
    );
    await userEvent.keyboard(backspaceTwice);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/pla'),
    );
  },
};

export const AResultNamingAnUnlistedCommandStaysPlainText: Story = {
  args: { suggestions: [unlistedSource] },
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await chooseSuggestion(field, '/gho', /ghost/);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/ghost '),
    );
    await userEvent.keyboard(backspaceTwice);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/ghos'),
    );
  },
};

export const ARestoredPluginSlashNameStaysPlainText: Story = {
  args: { initialValue: '/plan ', suggestions: [source, pluginSource] },
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.click(field);
    await userEvent.keyboard('{End}x');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/plan x'),
    );
    await userEvent.keyboard('{Backspace}{Backspace}{Backspace}');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/pla'),
    );
  },
};
