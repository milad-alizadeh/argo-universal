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
    commands.flatMap(({ name, description, hint }) =>
      name.startsWith(query)
        ? [
            {
              id: name,
              label: `/${name}`,
              detail: description,
              insert: `/${name} `,
              hint,
            },
          ]
        : [],
    ),
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
    await userEvent.type(field, '/rev');
    await userEvent.keyboard('{Enter}');
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
    await userEvent.type(field, '/rev');
    await userEvent.keyboard('{Enter}');
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
    await userEvent.type(field, '/ini');
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/init '),
    );
    await expect(within(field).queryByText(hintText)).not.toBeInTheDocument();
  },
};
