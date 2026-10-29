import type * as React from 'react';
import { View } from 'react-native';
import { menuSurfaceClassName } from '#kit/menu-surface';
import { Icon } from '#primitives/content/icon';
import { LiquidGlass } from '#primitives/content/liquid-glass';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import type {
  ComposerSuggestion,
  SuggestionGroup,
} from './rich-textarea-suggestions';

interface SuggestionListProps {
  groups: readonly SuggestionGroup[];
  onChoose: (suggestion: ComposerSuggestion) => void;
}

// Placement only: glass and the plain card both keep it.
const placementClassName =
  'absolute bottom-full left-0 right-0 mb-2';

// Four rows show before the list scrolls.
const listMaxHeight = 240;

const listProps = {
  appearance: 'plain',
  fit: true,
  maxHeight: listMaxHeight,
  keyboardShouldPersistTaps: 'always',
} as const;

interface RowProps {
  suggestion: ComposerSuggestion;
  onChoose: SuggestionListProps['onChoose'];
}

function SuggestionRow({ suggestion, onChoose }: RowProps): React.JSX.Element {
  const { icon } = suggestion;

  return (
    <ListItem
      title={suggestion.label}
      subtitle={suggestion.detail}
      subtitleLines={2}
      leading={icon ? <Icon name={icon} size="md" /> : undefined}
      accessibilityRole="button"
      onPress={() => onChoose(suggestion)}
    />
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

function SuggestionListBody(props: SuggestionListProps): React.JSX.Element {
  return (
    <View accessibilityLabel={props.groups[0]?.source.title} role="group">
      <List {...listProps}>
        <ListSection>{suggestionRows(props)}</ListSection>
      </List>
    </View>
  );
}

// The phone's list of matches, drawn above the plain text field in the Composer's glass; a press chooses one.
export function SuggestionList(props: SuggestionListProps): React.JSX.Element {
  return (
    <View className={placementClassName}>
      <LiquidGlass
        corners="sheet"
        className="w-full overflow-hidden"
        fallbackClassName={menuSurfaceClassName}
      >
        <SuggestionListBody {...props} />
      </LiquidGlass>
    </View>
  );
}
