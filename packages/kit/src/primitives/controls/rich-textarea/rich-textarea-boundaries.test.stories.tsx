import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { settleLayout } from '#mocks/story-layout';
import {
  RichTextareaExample,
  exampleLabel,
  shortcutModifier,
} from './rich-textarea-example.mocks';
import { suggestionsRichTextarea } from './rich-textarea-fixtures';

const meta = {
  title: 'Tests/Design System/Primitives/Controls/RichTextarea/Boundaries',
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

export const PathAcrossFormattingStaysPlain: Story = {
  args: { initialValue: '**src**' },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('textbox', { name: exampleLabel }));
    await userEvent.keyboard('{End}');
    await userEvent.keyboard(
      '{' + shortcutModifier + '>}b{/' + shortcutModifier + '}/sec',
    );
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('**src**/sec'),
    );
    await expect(
      screen.queryByRole('group', { name: 'Suggestions' }),
    ).not.toBeInTheDocument();
  },
};

export const SpaceAfterFormattingOpensSuggestions: Story = {
  args: { initialValue: '**src**' },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('textbox', { name: exampleLabel }));
    await userEvent.keyboard('{End} ');
    await userEvent.keyboard(
      '{' + shortcutModifier + '>}b{/' + shortcutModifier + '}/sec',
    );
    await screen.findByRole('option', { name: '/second Second option' });
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('**src** /second '),
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
