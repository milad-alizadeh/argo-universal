import type * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  menuInsetClassName,
  menuRowClassName,
  menuRowsClassName,
  menuSurfaceClassName,
} from '#kit/menu-surface';
import { cn } from '#kit/utils';
import { Text } from '#primitives/content/text';
import type {
  ComposerSuggestion,
  SuggestionGroup,
} from './rich-textarea-suggestions';

interface SuggestionListProps {
  groups: readonly SuggestionGroup[];
  onChoose: (suggestion: ComposerSuggestion) => void;
}

const listClassName = cn(
  menuSurfaceClassName,
  menuInsetClassName,
  'absolute bottom-full left-0 right-0 mb-2 max-h-60 overflow-hidden',
);

const rowClassName = cn(
  menuRowClassName,
  'flex-col items-stretch gap-0.5 active:bg-selected',
);

function SuggestionDetail({
  detail,
}: Pick<ComposerSuggestion, 'detail'>): React.JSX.Element | null {
  return detail ? (
    <Text role="secondary" dimmed>
      {detail}
    </Text>
  ) : null;
}

interface RowProps {
  suggestion: ComposerSuggestion;
  onChoose: SuggestionListProps['onChoose'];
}

function SuggestionRow({ suggestion, onChoose }: RowProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      className={rowClassName}
      onPress={() => onChoose(suggestion)}
    >
      <Text role="control">{suggestion.label}</Text>
      <SuggestionDetail detail={suggestion.detail} />
    </Pressable>
  );
}

function suggestionRows({
  groups,
  onChoose,
}: SuggestionListProps): React.JSX.Element[] {
  return groups.flatMap(({ source, suggestions }) =>
    suggestions.map((suggestion) => (
      <SuggestionRow
        key={`${source.id}-${suggestion.id}`}
        suggestion={suggestion}
        onChoose={onChoose}
      />
    )),
  );
}

function SuggestionRows(props: SuggestionListProps): React.JSX.Element {
  return (
    <ScrollView
      keyboardShouldPersistTaps="always"
      contentContainerClassName={menuRowsClassName}
    >
      {suggestionRows(props)}
    </ScrollView>
  );
}

// The phone's list of matches, drawn above the plain text field; a press chooses one.
export function SuggestionList(props: SuggestionListProps): React.JSX.Element {
  return (
    <View
      accessibilityLabel={props.groups[0]?.source.title}
      role="group"
      className={listClassName}
    >
      <SuggestionRows {...props} />
    </View>
  );
}
