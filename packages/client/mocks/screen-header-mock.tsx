import { Text } from '@repo/kit/primitives/content/text';
import { useWide } from '@repo/kit/use-wide/use-wide';
import type * as React from 'react';
import { View } from 'react-native';
import { HeaderItems } from '../src/lib/product/header-button';
import { HeaderSearchRow } from '../src/lib/product/navigation/header-search';
import type { ScreenHeaderProps } from '../src/lib/product/navigation/screen-header';

// Stands in for the stack's header in stories, laid out as the web's JS header draws it (getDefaultHeaderHeight, headerTitleAlign 'left'): one 64pt line of left item, left-aligned title and right items. As ScreenHeader, a wide window has none.
export function ScreenHeaderMock(
  props: ScreenHeaderProps,
): React.JSX.Element | null {
  if (useWide()) return null;

  return <HeaderMockBody {...props} />;
}

function HeaderMockBody({
  title,
  left,
  right,
  search,
}: ScreenHeaderProps): React.JSX.Element {
  return (
    <View className="h-16 flex-row items-center gap-4 bg-content px-4">
      {left ? <View className="flex-row">{left}</View> : null}
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
      <HeaderItems>{right}</HeaderItems>
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
      className="min-w-0 flex-1"
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

// A view's `renderHeader` slot filled with the mock, from the page's own header props.
export const mockHeader =
  <Props,>(toHeader: (props: Props) => ScreenHeaderProps) =>
  (props: Props): React.JSX.Element => (
    <ScreenHeaderMock {...toHeader(props)} />
  );
