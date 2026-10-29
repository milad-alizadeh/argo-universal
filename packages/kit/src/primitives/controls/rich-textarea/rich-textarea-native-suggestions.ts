import { useMemo, useState, useSyncExternalStore } from 'react';
import type { TextInputProps } from 'react-native';
import type { RichTextareaProps } from './rich-textarea-props';
import { useChosenResources } from './rich-textarea-resources';
import { SuggestionRun } from './rich-textarea-suggestion-run';
import {
  insertSuggestion,
  slashQueryAtCaret,
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
}

interface CaretState {
  chosen: Selection | null;
  position: number;
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
): Pick<CaretState, 'position' | 'collapsed'> => ({
  position: Math.min(caret.end, value.length),
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

const asksNothing = new SuggestionRun([], '');

/*
 * What the sources offer for a query, growing as their promises settle. A new query starts a new
 * run, so a late answer to an earlier one is never heard; null asks nothing.
 */
function useSuggestionGroups(
  sources: readonly SuggestionSource[],
  query: string | null,
): SuggestionGroup[] | null {
  const run = useMemo(
    () => (query === null ? asksNothing : new SuggestionRun(sources, query)),
    [sources, query],
  );

  const groups = useSyncExternalStore(run.subscribe, run.groups);

  return groups.length > 0 ? groups : null;
}

// The text typed after the `/` word the caret is in, while the caret is one place and not a selection.
function queryAt(value: string, caret: CaretState): string | null {
  return caret.collapsed ? slashQueryAtCaret(value, caret.position) : null;
}

// A choice that also tells the draft's resources.
const choosing =
  (
    choose: NativeSuggestions['choose'],
    track: NativeSuggestions['choose'],
  ): NativeSuggestions['choose'] =>
  (suggestion) => {
    choose(suggestion);
    track(suggestion);
  };

type NativeSuggestionProps = Pick<
  RichTextareaProps,
  'value' | 'onChangeText' | 'suggestions' | 'onResourcesChange'
>;

const noSources: readonly SuggestionSource[] = [];

// The `/` list of the phone's plain field: the text and the caret decide when it shows (ADR-0023).
export function useNativeSuggestions(
  props: NativeSuggestionProps,
): NativeSuggestions {
  const { value, onChangeText, suggestions = noSources } = props;
  const caret = useCaret(value);
  const track = useChosenResources(value, props.onResourcesChange);

  return {
    groups: useSuggestionGroups(suggestions, queryAt(value, caret)),
    fieldProps: fieldProps(caret, onChangeText),
    choose: choosing(chooser(value, caret, onChangeText), track),
  };
}
