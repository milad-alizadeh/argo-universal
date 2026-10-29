import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { createRef, type RefObject } from 'react';
import type * as React from 'react';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { exampleLabel } from './rich-textarea-example.mocks';
import { suggestionsRichTextarea } from './rich-textarea-fixtures';
import type {
  RichTextareaHandle,
  RichTextareaProps,
} from './rich-textarea-props';
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
  args: {
    onChangeText: fn(),
    suggestions: suggestionsRichTextarea.suggestions,
  },
} satisfies Meta<typeof NativeField>;

export default meta;

type Story = StoryObj<typeof meta>;

const firstOption = { name: '/first First option' };

const secondOption = { name: '/second Second option' };

export const SlashShowsTheListAndTypingNarrowsIt: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      'Try /',
    );
    await canvas.findByRole('button', firstOption);
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
    await userEvent.keyboard('{ArrowLeft>6/}');
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
    await userEvent.keyboard('{ArrowLeft>6/}');
    await canvas.findByRole('button', firstOption);
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(canvas.queryByRole('button', firstOption)).not.toBeInTheDocument(),
    );
  },
};

function insertingWord(initial: string): Story {
  const handle: RefObject<RichTextareaHandle | null> = createRef();

  return {
    args: { ref: handle },
    play: async ({ canvas, args }) => {
      const field = canvas.getByRole<HTMLTextAreaElement>('textbox', {
        name: exampleLabel,
      });

      if (initial) await userEvent.type(field, initial);
      handle.current?.insertWord('/');
      await waitFor(() =>
        expect(args.onChangeText).toHaveBeenLastCalledWith(
          initial === '' || initial.endsWith(' ')
            ? `${initial}/`
            : `${initial} /`,
        ),
      );
      await expect(field).toHaveFocus();
      await canvas.findByRole('button', firstOption);
    },
  };
}

export const InsertWordOpensTheListInAnEmptyField = insertingWord('');

export const InsertWordSpacesAfterText = insertingWord('Run');
