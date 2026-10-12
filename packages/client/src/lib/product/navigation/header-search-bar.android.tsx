import { DockedSearchBar, RNHostView, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '../../generic/primitives/host';
import { useComposeTextStyle } from '../../generic/primitives/native-typography';
import { Icon } from '../../generic/symbols/icon';
import type { HeaderSearchBarProps } from './header-search-bar';

/*
 * Material 3's search bar in the title's place. It reports every keystroke, so the list narrows as
 * the reader types; leaving the screen drops the bar and its query with it.
 */
export function HeaderSearchBar({
  search,
}: HeaderSearchBarProps): React.JSX.Element {
  return (
    <Host matchContents={{ vertical: true }} style={{ flex: 1 }}>
      <DockedSearchBar
        onQueryChange={search.onChangeText}
        modifiers={[fillMaxWidth()]}
      >
        <DockedSearchBar.LeadingIcon>
          <RNHostView matchContents>
            <Icon name="search" size="md" className="text-muted-foreground" />
          </RNHostView>
        </DockedSearchBar.LeadingIcon>
        <DockedSearchBar.Placeholder>
          <Placeholder text={search.placeholder} />
        </DockedSearchBar.Placeholder>
      </DockedSearchBar>
    </Host>
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
