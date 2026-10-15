import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/display/text';
import { HeaderSearchRow } from '../src/lib/product/navigation/header-search';
import type { ScreenHeaderProps } from '../src/lib/product/navigation/screen-header';

/*
 * Stands in for the native stack's header in stories: one line of left item, title and right items.
 * A centred title keeps a left slot to balance the right one. A search row with nothing on the left
 * starts its title at the list's 16pt gutter; its last icon ends on the rows' chevron column, the
 * gutter and row inset less the header button's own inset.
 */
export function ScreenHeaderMock({
  title,
  left,
  right,
  search,
}: ScreenHeaderProps): React.JSX.Element {
  const leading = left !== undefined || !search;

  return (
    <View className={headerClasses(leading)}>
      {leading ? <View className="w-23 flex-row">{left}</View> : null}
      <HeaderContent title={title} right={right} search={search} />
    </View>
  );
}

const headerClasses = (leading: boolean): string =>
  cn('h-11 flex-row items-center bg-content', leading ? 'px-1' : 'pr-5 pl-4');

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
      accessibilityRole="heading"
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
