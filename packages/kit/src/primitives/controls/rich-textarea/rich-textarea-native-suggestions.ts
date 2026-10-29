import { useEffect, useMemo, useState } from 'react';
import type { TextInputProps } from 'react-native';
import {
  insertSuggestion,
  slashQueryAtCaret,
  startSuggestionQuery,
  type ComposerSuggestion,
  type SuggestionGroup,
  type SuggestionRun,
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

interface Arrived {
  run: SuggestionRun;
  groups: SuggestionGroup[];
}

/*
 * What the sources offer for a query, growing as their promises settle. A new query starts a new
 * run, so a late answer to an earlier one is never heard; null asks nothing.
 */
function useSuggestionGroups(
  sources: readonly SuggestionSource[],
  query: string | null,
): SuggestionGroup[] | null {
  const run = useMemo(
    () => (query === null ? null : startSuggestionQuery(sources, query)),
    [sources, query],
  );
  const [arrived, setArrived] = useState<Arrived | null>(null);

  useEffect(
    () => run?.subscribe(() => setArrived({ run, groups: run.groups() })),
    [run],
  );

  if (!run) return null;
  const groups = arrived?.run === run ? arrived.groups : run.groups();

  return groups.length > 0 ? groups : null;
}

// The `/` list of the phone's plain field: the text and the caret decide when it shows (ADR-0023).
export function useNativeSuggestions(
  value: string,
  onChangeText: (value: string) => void,
  sources: readonly SuggestionSource[],
): NativeSuggestions {
  const caret = useCaret(value);

  const query = caret.collapsed
    ? slashQueryAtCaret(value, caret.position)
    : null;
  const groups = useSuggestionGroups(sources, query);

  return {
    groups,
    fieldProps: fieldProps(caret, onChangeText),
    choose: chooser(value, caret, onChangeText),
  };
}
