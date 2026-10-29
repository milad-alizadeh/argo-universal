import { useState } from 'react';
import type { TextInputProps } from 'react-native';
import type { RichTextareaHandle } from './rich-textarea-props';
import {
  insertSuggestion,
  insertWordAtCaret,
  suggestionsAtCaret,
  type ComposerSuggestion,
  type SuggestionGroup,
  type SuggestionSource,
} from './rich-textarea-suggestions';

interface Selection {
  start: number;
  end: number;
}

export interface NativeSuggestions {
  groups: SuggestionGroup[] | null;
  // Props for the text field: the draft, the caret, and a caret to hand it after a choice.
  fieldProps: Pick<
    TextInputProps,
    'onChangeText' | 'onSelectionChange' | 'selection'
  >;
  choose: (suggestion: ComposerSuggestion) => void;
  insertWord: RichTextareaHandle['insertWord'];
}

interface CaretState {
  chosen: Selection | null;
  position: number;
  selected: Selection;
  collapsed: boolean;
  report: (event: SelectionEvent) => void;
  place: (selection: Selection) => void;
  release: () => void;
}

type SelectionEvent = Parameters<
  NonNullable<TextInputProps['onSelectionChange']>
>[0];

const atEnd = (value: string): Selection => ({
  start: value.length,
  end: value.length,
});

const where = (
  caret: Selection,
  value: string,
): Pick<CaretState, 'position' | 'selected' | 'collapsed'> => ({
  position: Math.min(caret.end, value.length),
  selected: {
    start: Math.min(caret.start, value.length),
    end: Math.min(caret.end, value.length),
  },
  collapsed: caret.start === caret.end,
});

// The caret the field last reported, until a choice sets one; at the end of the text before either.
function useCaret(value: string): CaretState {
  const [reported, setReported] = useState<Selection | null>(null);
  const [chosen, setChosen] = useState<Selection | null>(null);
  const caret = chosen ?? reported ?? atEnd(value);

  return {
    chosen,
    place: setChosen,
    release: () => setChosen(null),
    ...where(caret, value),
    report: (event) => {
      setReported(event.nativeEvent.selection);
      setChosen(null);
    },
  };
}

function chooser(
  value: string,
  caret: CaretState,
  onChangeText: (value: string) => void,
): NativeSuggestions['choose'] {
  return (suggestion) => {
    const inserted = insertSuggestion(value, caret.position, suggestion);

    caret.place({ start: inserted.caret, end: inserted.caret });
    onChangeText(inserted.text);
  };
}

function wordInserter(
  value: string,
  caret: CaretState,
  onChangeText: (value: string) => void,
): NativeSuggestions['insertWord'] {
  return (word) => {
    const inserted = insertWordAtCaret(value, caret.selected, word);

    caret.place({ start: inserted.caret, end: inserted.caret });
    onChangeText(inserted.text);
  };
}

// Typing hands the caret back to the field.
function typer(
  caret: CaretState,
  onChangeText: (value: string) => void,
): (value: string) => void {
  return (changed) => {
    caret.release();
    onChangeText(changed);
  };
}

function fieldProps(
  caret: CaretState,
  onChangeText: (value: string) => void,
): NativeSuggestions['fieldProps'] {
  return {
    onChangeText: typer(caret, onChangeText),
    onSelectionChange: caret.report,
    selection: caret.chosen ?? undefined,
  };
}

// The `/` list of the phone's plain field: the text and the caret decide when it shows (ADR-0023).
export function useNativeSuggestions(
  value: string,
  onChangeText: (value: string) => void,
  sources: readonly SuggestionSource[],
): NativeSuggestions {
  const caret = useCaret(value);

  return {
    groups: caret.collapsed
      ? suggestionsAtCaret(value, caret.position, sources)
      : null,
    fieldProps: fieldProps(caret, onChangeText),
    choose: chooser(value, caret, onChangeText),
    insertWord: wordInserter(value, caret, onChangeText),
  };
}
