import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { createRef, type RefObject } from 'react';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import {
  exampleLabel,
  follows,
  lateItem,
  lateName,
  lateSource,
} from './rich-textarea-example.mocks';
import { suggestionsRichTextarea } from './rich-textarea-fixtures';
import { iconlessSuggestionsRichTextarea } from './rich-textarea-iconless.mocks';
import type {
  RichTextareaHandle,
  RichTextareaProps,
} from './rich-textarea-props';
import {
  exampleItem,
  optionsSource,
  twoSourcesRichTextarea,
} from './rich-textarea-sources-fixtures';
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
    onResourcesChange: fn(),
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

// The second-source fixtures carry no icon, so their rows keep the slash in the name.
const sourceFirstOption = { name: /^\/first/ };

const itemOption = { name: /^Item 7/ };

export const ResultsShowGroupedUnderEachSourceInOrder: Story = {
  args: { suggestions: twoSourcesRichTextarea.suggestions },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    const first = await canvas.findByRole('button', sourceFirstOption);
    const item = canvas.getByRole('button', itemOption);
    await expect(follows(canvas.getByText('Suggestions'), first)).toBe(true);
    await expect(follows(first, canvas.getByText('Items'))).toBe(true);
    await expect(follows(canvas.getByText('Items'), item)).toBe(true);
  },
};

// Each story owns its late source, so no answer reaches another story.
const joining = lateSource('Late');

export const ASourceThatAnswersLateJoinsWithoutHidingTheRest: Story = {
  args: { suggestions: [optionsSource, joining.source] },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    await canvas.findByRole('button', sourceFirstOption);
    await expect(
      canvas.queryByRole('button', { name: lateName('late-1') }),
    ).not.toBeInTheDocument();
    joining.answer('', [lateItem('late-1')]);
    await canvas.findByRole('button', { name: lateName('late-1') });
    await expect(
      canvas.getByRole('button', sourceFirstOption),
    ).toBeInTheDocument();
  },
};

const changing = lateSource('Late');

export const AnAnswerForAQueryThatHasChangedIsIgnored: Story = {
  args: { suggestions: [changing.source] },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/a',
    );
    await userEvent.keyboard('b');
    changing.answer('a', [lateItem('stale')]);
    changing.answer('ab', [lateItem('fresh')]);
    await canvas.findByRole('button', { name: lateName('fresh') });
    await expect(
      canvas.queryByRole('button', { name: lateName('stale') }),
    ).not.toBeInTheDocument();
  },
};

export const AChosenResultWithAResourceSendsItsTextAndResource: Story = {
  args: { suggestions: twoSourcesRichTextarea.suggestions },
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      'See /it',
    );
    await userEvent.click(await canvas.findByRole('button', itemOption));
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('See ITEM-7 '),
    );
    await waitFor(() =>
      expect(args.onResourcesChange).toHaveBeenLastCalledWith([
        exampleItem.resource,
      ]),
    );
    await userEvent.clear(canvas.getByRole('textbox', { name: exampleLabel }));
    await waitFor(() =>
      expect(args.onResourcesChange).toHaveBeenLastCalledWith([]),
    );
  },
};

export const AnAnswerThatIsAlreadySettledStillShows: Story = {
  args: {
    suggestions: [
      {
        id: 'ready',
        title: 'Ready',
        query: () => Promise.resolve([lateItem('ready-1')]),
      },
    ],
  },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    await canvas.findByRole('button', { name: 'Late ready-1' });
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
