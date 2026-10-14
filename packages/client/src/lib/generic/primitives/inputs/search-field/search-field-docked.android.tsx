import type * as React from 'react';
import { View } from 'react-native';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import { DockedSearchBody } from './search-field-docked-content.android';
import { useHeaderSearch } from './search-field-header-search.android';
import type { DockedSearchBarProps } from './search-field-props';

/*
 * Gmail's search bar at the top of a list, scrolling with it; tapping it opens full-screen search in the app bar's place.
 * The class places it in the list's gutter. A wide window searches from its title row instead.
 */
export function DockedSearchField(
  props: DockedSearchBarProps,
): React.JSX.Element | null {
  if (useWide()) return null;

  return <PhoneDockedSearch {...props} />;
}

function PhoneDockedSearch({
  className,
  ...props
}: DockedSearchBarProps): React.JSX.Element | null {
  const search = useHeaderSearch(props);

  // The app bar holds the open search, so the list keeps no empty place for it.
  if (search.open && search.inHeader) return null;

  return (
    <View className={className}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <DockedSearchBody {...props} search={search} />
      </Host>
    </View>
  );
}

DockedSearchField satisfies React.ComponentType<DockedSearchBarProps>;
