import { DockedSearchBar, RNHostView, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '../../generic/primitives/host';
import { useComposeTextStyle } from '../../generic/primitives/native-typography';
import { Icon } from '../../generic/symbols/icon';
import type { IconName } from '../../generic/symbols/icon-names';
import type { HeaderSearchBarProps } from './header-search-bar';

/*
 * Material 3's search bar in the title's place. Tapping it opens search over the whole header: Back
 * closes it and clears the query, ✕ clears the text, and the list narrows with every keystroke.
 */
export function HeaderSearchBar({
  search,
  onSearchingChange,
}: HeaderSearchBarProps): React.JSX.Element {
  const [searching, setSearching] = useState(false);
  const { muted } = useNativeTheme().colors;
  const onExpandedChange = (expanded: boolean): void => {
    setSearching(expanded);
    onSearchingChange?.(expanded);
  };
  return (
    <Host matchContents={{ vertical: true }} style={{ flex: 1 }}>
      <DockedSearchBar
        onQueryChange={search.onChangeText}
        onExpandedChange={onExpandedChange}
        // Open, the field lies flat on the header, as Paper's search view draws it.
        containerColor={searching ? 'transparent' : muted}
        modifiers={[fillMaxWidth()]}
      >
        <SearchBarSlots placeholder={search.placeholder} />
      </DockedSearchBar>
    </Host>
  );
}

function SearchBarSlots({
  placeholder,
}: {
  placeholder: string;
}): React.JSX.Element {
  return (
    <>
      <DockedSearchBar.LeadingIcon>
        <SlotIcon name="search" muted />
      </DockedSearchBar.LeadingIcon>
      <DockedSearchBar.BackIcon>
        <SlotIcon name="arrow-left" />
      </DockedSearchBar.BackIcon>
      <DockedSearchBar.ClearIcon>
        <SlotIcon name="close" />
      </DockedSearchBar.ClearIcon>
      <DockedSearchBar.Placeholder>
        <Placeholder text={placeholder} />
      </DockedSearchBar.Placeholder>
    </>
  );
}

function SlotIcon(props: {
  name: IconName;
  muted?: boolean;
}): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <Icon
        name={props.name}
        size="md"
        className={props.muted ? 'text-muted-foreground' : 'text-foreground'}
      />
    </RNHostView>
  );
}

function Placeholder({ text }: { text: string }): React.JSX.Element {
  const style = useComposeTextStyle('body');
  const { mutedForeground } = useNativeTheme().colors;
  return (
    <Text color={mutedForeground} style={style} maxLines={1}>
      {text}
    </Text>
  );
}
