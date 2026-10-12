import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  SearchField,
  type SearchFieldProps,
} from '../primitives/inputs/search-field/search-field';
import { BackButton } from './back-button';
import { PageTitle, type PageTitleProps } from './page-title';

export type PageTitleSearch = Pick<
  SearchFieldProps,
  'label' | 'value' | 'onChangeText'
>;

export interface PageTitleRowProps extends PageTitleProps {
  // Controls that sit to the right of the title.
  actions?: ReactNode;
  // Search, last after the actions, opens a field over the whole row.
  search?: PageTitleSearch;
  // A drill-in page returns to the page it came from.
  onBack?: () => void;
}

// A page's title row: an optional back button, the title, its actions and its search.
export function PageTitleRow(props: PageTitleRowProps): React.JSX.Element {
  if (props.search)
    return (
      <View className="flex-row items-center">
        <HangingBack onBack={props.onBack} />
        <SearchField
          {...props.search}
          title={<PageTitle {...props} />}
          actions={props.actions}
        />
      </View>
    );
  return (
    // As tall as the search row, so the title sits at one height on every page.
    <View className="h-10 flex-row items-center gap-4">
      <HangingBack onBack={props.onBack} />
      <View className="min-w-0 flex-1">
        <PageTitle {...props} />
      </View>
      {props.actions}
    </View>
  );
}

// The back button hangs in the margin left of the title, so titles line up with or without it, centred on the title's line.
function HangingBack({
  onBack,
}: Pick<PageTitleRowProps, 'onBack'>): React.JSX.Element | null {
  if (!onBack) return null;
  return (
    <View className="absolute inset-y-0 -left-8 justify-center">
      <BackButton onBack={onBack} />
    </View>
  );
}
