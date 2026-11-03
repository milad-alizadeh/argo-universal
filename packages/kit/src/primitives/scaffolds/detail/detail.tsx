import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { ListPlaceContext } from '#kit/list-place';
import { cn } from '#kit/utils';
import { Markdown } from '#primitives/content/markdown';
import { Spinner } from '#primitives/status/spinner';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import { useAsideLead } from '../screen/screen-aside';
import { screenContentEnds } from '../screen/screen-column';
import type { DetailProps } from './detail-props';

/*
 * Under iOS 26's transparent header, the page starts below it and scrolls on under the glass. A phone's scroll view
 * keeps its own margins; a wide window's Screen column pads it.
 */
const scroll = {
  surfaceClassName: 'bg-content',
  contentContainerClassName: cn('px-4 wide:px-0', screenContentEnds),
  contentInsetAdjustmentBehavior: 'automatic',
} as const;

/*
 * Foundations / Detail: an item's content. Its Screen declares the header Actions and holds its Metadata in the
 * `aside`; where the aside has no column, its Pills lead the content and scroll away with it.
 */
export function Detail(props: DetailProps): ReactElement {
  const lead = useAsideLead();

  return (
    <ScrollFadeView {...scroll} testID={props.testID}>
      <ListPlaceContext value="detail">
        {lead ? <View className="pb-4">{lead}</View> : null}
        <DetailContent {...props} />
      </ListPlaceContext>
    </ScrollFadeView>
  );
}

function DetailContent({
  markdown,
  isLoading,
  children,
}: DetailProps): ReactNode {
  if (isLoading) return <DetailLoading />;

  return (
    <View className="gap-4">
      {markdown ? <Markdown text={markdown} /> : null}
      {children}
    </View>
  );
}

function DetailLoading(): ReactElement {
  return (
    <View className="items-center py-8">
      <Spinner accessibilityLabel="Loading" />
    </View>
  );
}
