import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { settleLayout } from '#mocks/story-layout';
import {
  ButtonSuggestionsExample,
  LateSuggestionsExample,
  RichTextareaExample,
  exampleLabel,
} from './rich-textarea-example.mocks';
import { suggestionsRichTextarea } from './rich-textarea-fixtures';

const firstOptionName = '/first First option';

const secondOptionName = '/second Second option';

const meta = {
  title: 'Tests/Design System/Primitives/Controls/RichTextarea/Suggestions',
  component: RichTextareaExample,
  args: {
    onChangeText: fn(),
    onSubmit: fn(),
    suggestions: suggestionsRichTextarea.suggestions,
  },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide');
  },
} satisfies Meta<typeof RichTextareaExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReturnChoosesAndLeavesTheCaretAfterTheSpace: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    await screen.findByRole('option', { name: firstOptionName });
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/first '),
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.keyboard('args');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/first args'),
    );
    await waitFor(() =>
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument(),
    );
    await userEvent.keyboard('{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
  },
};

export const SuggestionsArrivingAfterTheSlashOpenTheMenu: Story = {
  render: (args) => <LateSuggestionsExample {...args} />,
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    await screen.findByRole('option', { name: firstOptionName });
  },
};

export const SuggestionsArrivingElsewhereKeepFocusAndOpenNoMenu: Story = {
  render: (args) => <ButtonSuggestionsExample {...args} />,
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    const deliver = canvas.getByRole('button', { name: 'Deliver suggestions' });

    await userEvent.click(deliver);
    await waitFor(() => expect(deliver).toHaveFocus());
    await expect(
      screen.queryByRole('option', { name: firstOptionName }),
    ).not.toBeInTheDocument();
    await expect(deliver).toHaveFocus();
  },
};

export const ArrowsAndTabChooseTheHighlightedSuggestion: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      'Choose /',
    );
    await screen.findByRole('option', { name: firstOptionName });
    await userEvent.keyboard('{ArrowDown}{ArrowUp}{ArrowDown}{Tab}');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('Choose /second '),
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const TypingNarrowsTheMenuAndNoMatchClosesIt: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    await screen.findByRole('option', { name: firstOptionName });
    await userEvent.keyboard('sec');
    await screen.findByRole('option', { name: secondOptionName });
    await waitFor(() =>
      expect(
        screen.queryByRole('option', { name: firstOptionName }),
      ).not.toBeInTheDocument(),
    );
    await userEvent.keyboard('z');
    await waitFor(() =>
      expect(
        screen.queryByRole('group', { name: 'Suggestions' }),
      ).not.toBeInTheDocument(),
    );
    await userEvent.keyboard('{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
  },
};

export const EscapeKeepsTheSlashWord: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/sec',
    );
    await screen.findByRole('option', { name: secondOptionName });
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        screen.queryByRole('group', { name: 'Suggestions' }),
      ).not.toBeInTheDocument(),
    );
    await expect(args.onChangeText).toHaveBeenLastCalledWith('/sec');
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
  },
};

function plainText(text: string): Story {
  return {
    play: async ({ canvas, args }) => {
      await userEvent.type(
        canvas.getByRole('textbox', { name: exampleLabel }),
        text,
      );
      await waitFor(() =>
        expect(args.onChangeText).toHaveBeenLastCalledWith(text),
      );
      await expect(
        screen.queryByRole('group', { name: 'Suggestions' }),
      ).not.toBeInTheDocument();
    },
  };
}

export const PathStaysPlainText = plainText('src/app');

export const UrlStaysPlainText = plainText('https://example.com');

export const SlashAndSpaceStaysPlainText = plainText('/ ');

export const SuggestionsAndReferencesKeepTheirOwnTriggers: Story = {
  args: {
    references: [{ number: 123, title: 'Example reference', state: 'open' }],
  },
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/sec',
    );
    await screen.findByRole('option', { name: secondOptionName });
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/second '),
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.keyboard('#12');
    await screen.findByRole('option', { name: /#123/ });
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/second #123 '),
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
