import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import { HeaderSearchRow } from '../src/lib/product/navigation/header-search';
import type { ScreenHeaderProps } from '../src/lib/product/navigation/screen-header';

// Stands in for the native stack's header in stories: one line of left item, title and right items.
export function ScreenHeaderMock({
  title,
  left,
  right,
  search,
}: ScreenHeaderProps): React.JSX.Element {
  return (
    <View className="h-11 flex-row items-center bg-content px-1">
      <View className="w-23 flex-row">{left}</View>
      <HeaderContent title={title} right={right} search={search} />
    </View>
  );
}

function HeaderTitle({
  title,
  right,
}: Pick<ScreenHeaderProps, 'title' | 'right'>): React.JSX.Element {
  return (
    <>
      <TitleText title={title} />
      <View className="w-23 flex-row justify-end gap-1">{right}</View>
    </>
  );
}

function TitleText({
  title,
}: Pick<ScreenHeaderProps, 'title'>): React.JSX.Element {
  return (
    <Text
      semanticRole="heading"
      role="nav-title"
      aria-level={1}
      numberOfLines={1}
      className="min-w-0 flex-1 text-center"
    >
      {title}
    </Text>
  );
}

function HeaderContent({
  title,
  right,
  search,
}: Pick<ScreenHeaderProps, 'title' | 'right' | 'search'>): React.JSX.Element {
  return search ? (
    <HeaderSearchRow title={title} right={right} search={search} />
  ) : (
    <HeaderTitle title={title} right={right} />
  );
}
