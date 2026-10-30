import type * as React from 'react';
import { useId } from 'react';
import { View } from 'react-native';
import { ListPlaceContext } from '#kit/list-place';
import { menuInsetClassName, menuSurfaceClassName } from '#kit/menu-surface';
import { Icon } from '#primitives/content/icon';
import { LiquidGlass } from '#primitives/content/liquid-glass';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Portal, PortalHost } from '#primitives/overlays/portal';
import type {
  ComposerSuggestion,
  SuggestionGroup,
} from './rich-textarea-suggestions';

interface SuggestionListProps {
  groups: readonly SuggestionGroup[];
  onChoose: (suggestion: ComposerSuggestion) => void;
}

// Placement only: the gap above the card; glass and the plain card both keep it.
const placementClassName = 'w-full pb-2';

// Beyond 200 the rows scroll inside the box.
const listMaxHeight = 200;

const listProps = {
  appearance: 'plain',
  fit: true,
  maxHeight: listMaxHeight,
  keyboardShouldPersistTaps: 'always',
} as const;

// With an icon the row names the command bare; the text a press inserts still starts with the slash.
const leadingSlash = /^\//;

interface RowProps {
  suggestion: ComposerSuggestion;
  onChoose: SuggestionListProps['onChoose'];
}

function SuggestionRow({ suggestion, onChoose }: RowProps): React.JSX.Element {
  const { icon, label } = suggestion;

  return (
    <ListItem
      title={icon ? label.replace(leadingSlash, '') : label}
      subtitle={suggestion.detail}
      subtitleLines={2}
      leading={icon ? <Icon name={icon} size="md" /> : undefined}
      accessibilityRole="button"
      onPress={() => onChoose(suggestion)}
    />
  );
}

interface SectionProps {
  group: SuggestionGroup;
  onChoose: SuggestionListProps['onChoose'];
}

const sectionRows = ({ group, onChoose }: SectionProps): React.JSX.Element[] =>
  group.suggestions.map((suggestion) => (
    <SuggestionRow
      key={suggestion.id}
      suggestion={suggestion}
      onChoose={onChoose}
    />
  ));

function SuggestionSection(props: SectionProps): React.JSX.Element {
  return (
    <ListSection title={props.group.source.title}>
      {sectionRows(props)}
    </ListSection>
  );
}

// Each source's title heads its own section, in the order the sources are given.
function suggestionSections({
  groups,
  onChoose,
}: SuggestionListProps): React.JSX.Element[] {
  return groups.map((group) => (
    <SuggestionSection
      key={group.source.id}
      group={group}
      onChoose={onChoose}
    />
  ));
}

function SuggestionListBody(props: SuggestionListProps): React.JSX.Element {
  return (
    <View
      accessibilityLabel={props.groups[0]?.source.title}
      className={menuInsetClassName}
      role="group"
    >
      <ListPlaceContext value="popover">
        <List {...listProps}>{suggestionSections(props)}</List>
      </ListPlaceContext>
    </View>
  );
}

function SuggestionList(props: SuggestionListProps): React.JSX.Element {
  return (
    <View className={placementClassName}>
      <LiquidGlass
        corners="sheet"
        interactive
        className="w-full"
        fallbackClassName={menuSurfaceClassName}
      >
        <SuggestionListBody {...props} />
      </LiquidGlass>
    </View>
  );
}

const hostName = 'rich-textarea-suggestions';

/*
 * The phone's list of matches, drawn in the Composer's glass; a press chooses one. It is drawn at the
 * SuggestionListHost, above the Composer's card, never inside it: glass inside the card's own glass draws darker.
 */
export function SuggestionPortal(
  props: SuggestionListProps,
): React.JSX.Element {
  return (
    <Portal hostName={hostName} name={useId()}>
      <SuggestionList {...props} />
    </Portal>
  );
}

// Where the list is drawn: in the column above the field's card, as wide as the card, growing the column upward.
export function SuggestionListHost(): React.JSX.Element {
  return <PortalHost name={hostName} />;
}
