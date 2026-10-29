import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen, waitFor, within } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { settleLayout } from '#mocks/story-layout';
import {
  exampleLabel as label,
  RichTextareaExample,
} from './rich-textarea-example.mocks';
import type { SuggestionSource } from './rich-textarea-suggestions';

// A Slash command the editor knows is drawn as a token, and the draft's text stays what was typed.

const hintText = 'a branch';

const reviewName = 'review';

const initName = 'init';

const withArgument = '/review main';

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

// A token is the editor's own non-editable chip around the command's name.
function tokenIn(field: HTMLElement, name: string): HTMLElement | null {
  const chips = field.querySelectorAll<HTMLElement>(
    '[contenteditable="false"]',
  );

  return (
    [...chips].find((chip) => chip.textContent?.includes(`/${name}`)) ?? null
  );
}

export const AChosenCommandIsATokenAndTheTextIsNameAndSpace: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, '/rev');
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/review '),
    );
    await waitFor(() => expect(tokenIn(field, reviewName)).not.toBeNull());
  },
};

export const ATypedKnownCommandBecomesAToken: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, 'Then /init now');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('Then /init now'),
    );
    await waitFor(() => expect(tokenIn(field, initName)).not.toBeNull());
  },
};

export const AnUnknownCommandStaysPlainText: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, '/nothing here');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/nothing here'),
    );
    await expect(tokenIn(field, 'nothing')).toBeNull();
  },
};

export const APathStaysPlainText: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, 'src/init now');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('src/init now'),
    );
    await expect(tokenIn(field, initName)).toBeNull();
  },
};

export const ARestoredDraftRebuildsTheTokenAndKeepsItsText: Story = {
  args: { initialValue: withArgument },
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await waitFor(() => expect(tokenIn(field, reviewName)).not.toBeNull());
    await expect(within(field).getByText(/main/)).toBeVisible();
    await expect(field).toHaveTextContent(withArgument);
  },
};

export const TheHintShowsAfterTheCommandUntilAnArgumentIsTyped: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, '/rev');
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(within(field).getByText(hintText)).toBeVisible(),
    );
    await userEvent.keyboard('main');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith(withArgument),
    );
    await waitFor(() =>
      expect(within(field).queryByText(hintText)).not.toBeInTheDocument(),
    );
    await expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
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
    await waitFor(() => expect(tokenIn(field, initName)).not.toBeNull());
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
