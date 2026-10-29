import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { createRef, type RefObject } from 'react';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { exampleLabel } from './rich-textarea-example.mocks';
import { suggestionsRichTextarea } from './rich-textarea-fixtures';
import { iconlessSuggestionsRichTextarea } from './rich-textarea-iconless.mocks';
import type {
  RichTextareaHandle,
  RichTextareaProps,
} from './rich-textarea-props';
import { SuggestionListHost } from './rich-textarea-suggestion-list';
import { RichTextarea } from './rich-textarea.native';

// The phone drawing, drawn on the web preview: a controlled field that keeps its draft.
function NativeField({
  onChangeText,
  ...props
}: Omit<RichTextareaProps, 'value' | 'accessibilityLabel'>): React.JSX.Element {
  const [value, setValue] = useState('');

  return (
    <RichTextarea
      {...props}
      accessibilityLabel={exampleLabel}
      value={value}
      onChangeText={(changed) => {
        setValue(changed);
        onChangeText(changed);
      }}
    />
  );
}

const meta = {
  title: 'Tests/Design System/Primitives/Controls/RichTextarea/Native',
  component: NativeField,
  parameters: { screenPreview: true },
  // The Composer sits at the bottom, so the list opens upward into the room above the field.
  render: (args): React.JSX.Element => (
    <View className="flex-1 justify-end">
      <SuggestionListHost />
      <NativeField {...args} />
    </View>
  ),
  args: {
    onChangeText: fn(),
    suggestions: suggestionsRichTextarea.suggestions,
  },
} satisfies Meta<typeof NativeField>;

export default meta;

type Story = StoryObj<typeof meta>;

// Rows with an icon name the command without its slash.
const firstOption = { name: 'first' };

const secondOption = { name: 'second' };

// Moves the caret back over " later".
const backOverLater = '{ArrowLeft>6/}';

export const SlashShowsTheListAndTypingNarrowsIt: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      'Try /',
    );
    await canvas.findByRole('button', firstOption);
    await expect(canvas.getByText('First option')).toBeVisible();
    await userEvent.keyboard('sec');
    await canvas.findByRole('button', secondOption);
    await waitFor(() =>
      expect(canvas.queryByRole('button', firstOption)).not.toBeInTheDocument(),
    );
    await userEvent.keyboard('z');
    await waitFor(() =>
      expect(
        canvas.queryByRole('button', secondOption),
      ).not.toBeInTheDocument(),
    );
  },
};

export const TappingAResultReplacesTheSlashWord: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      'Run /sec later',
    );
    await userEvent.keyboard(backOverLater);
    await userEvent.click(await canvas.findByRole('button', secondOption));
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('Run /second  later'),
    );
    await expect(
      canvas.getByRole<HTMLTextAreaElement>('textbox', { name: exampleLabel })
        .selectionStart,
    ).toBe('Run /second '.length);
    await expect(canvas.queryByRole('group')).not.toBeInTheDocument();
  },
};

export const RowWithoutAnIconKeepsTheSlash: Story = {
  args: { suggestions: iconlessSuggestionsRichTextarea.suggestions },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    await expect(await canvas.findByText('/plain')).toBeVisible();
    await expect(canvas.getByText('Plain option')).toBeVisible();
  },
};

function plainText(text: string): Story {
  return {
    play: async ({ canvas }) => {
      const field = canvas.getByRole('textbox', { name: exampleLabel });

      await userEvent.type(field, text);
      await waitFor(() => expect(field).toHaveValue(text));
      await expect(canvas.queryByRole('group')).not.toBeInTheDocument();
    },
  };
}

export const PathStaysPlainText = plainText('src/app');

export const SlashAndSpaceStaysPlainText = plainText('/ ');

export const MovingTheCaretOutOfTheWordHidesTheList: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/fi later',
    );
    await expect(canvas.queryByRole('group')).not.toBeInTheDocument();
    await userEvent.keyboard(backOverLater);
    await canvas.findByRole('button', firstOption);
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(canvas.queryByRole('button', firstOption)).not.toBeInTheDocument(),
    );
  },
};

// Types the initial text, then moves the caret or selection with keystrokes the native selection tracking sees.
async function typeThenPlace(
  field: HTMLTextAreaElement,
  initial: string,
  place: string,
): Promise<void> {
  if (initial) await userEvent.type(field, initial);

  if (place) await userEvent.keyboard(place);
}

function insertingWord(initial: string, expected: string, place = ''): Story {
  const handle: RefObject<RichTextareaHandle | null> = createRef();

  return {
    args: { ref: handle },
    play: async ({ canvas, args }) => {
      const field = canvas.getByRole<HTMLTextAreaElement>('textbox', {
        name: exampleLabel,
      });

      await typeThenPlace(field, initial, place);
      await expect(handle.current).not.toBeNull();
      handle.current?.insertWord('/');
      await waitFor(() =>
        expect(args.onChangeText).toHaveBeenLastCalledWith(expected),
      );
      await expect(field).toHaveFocus();
      await canvas.findByRole('button', firstOption);
    },
  };
}

export const InsertWordOpensTheListInAnEmptyField = insertingWord('', '/');

export const InsertWordSpacesAfterText = insertingWord('Run', 'Run /');

// The caret sits after "Run", so the slash goes there and " later" stays.
export const InsertWordInsertsAtAMidTextCaret = insertingWord(
  'Run later',
  'Run / later',
  backOverLater,
);

// A selected " later" is replaced by the slash.
export const InsertWordReplacesTheSelection = insertingWord(
  'Run later',
  'Run /',
  `{Shift>}${backOverLater}{/Shift}`,
);
