import type * as React from 'react';
import { useId } from 'react';
import { View } from 'react-native';
import { menuInsetClassName, menuSurfaceClassName } from '#kit/menu-surface';
import { LiquidGlass } from '#primitives/content/liquid-glass';
import { Portal, PortalHost } from '#primitives/overlays/portal';
import { SuggestionMenu } from './rich-textarea-suggestion-menu';
import { groupRows } from './rich-textarea-suggestion-row';
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

// A press reports the result its row draws.
const chooseAt =
  ({ groups, onChoose }: SuggestionListProps) =>
  (index: number): void => {
    const suggestion = groups.flatMap((group) => group.suggestions)[index];

    if (suggestion) onChoose(suggestion);
  };

function SuggestionListBody(props: SuggestionListProps): React.JSX.Element {
  return (
    <View
      accessibilityLabel={props.groups[0]?.source.title}
      className={menuInsetClassName}
      role="group"
    >
      <SuggestionMenu
        rows={groupRows(props.groups)}
        maxHeight={listMaxHeight}
        onChoose={chooseAt(props)}
      />
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
