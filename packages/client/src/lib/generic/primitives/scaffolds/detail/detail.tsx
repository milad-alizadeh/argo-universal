import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { usePageContentActions } from '#primitives/scaffolds/page';
import { Spinner } from '#primitives/status/spinner';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import { DetailColumns } from './detail-columns';
import type { DetailProps } from './detail-props';

// Under iOS 26's transparent header, the page starts below it and scrolls on under the glass.
const scroll = {
  surfaceClassName: 'bg-content',
  contentContainerClassName: 'px-4 pt-2 pb-6 wide:px-0 wide:pt-0',
  contentInsetAdjustmentBehavior: 'automatic',
} as const;

// Foundations / Detail: content, then its Metadata beside it on wide containers.
export function Detail(props: DetailProps): ReactElement {
  return (
    <ScrollFadeView {...scroll} testID={props.testID}>
      <DetailColumns metadata={props.metadata}>
        <DetailContent {...props} />
      </DetailColumns>
      <DetailActions actions={props.actions} />
    </ScrollFadeView>
  );
}

// Inside a Page the Actions join its header; on their own they follow the content.
function DetailActions({ actions }: Pick<DetailProps, 'actions'>): ReactNode {
  const inPage = usePageContentActions(actions);

  return inPage ? null : actions;
}

function DetailContent({
  markdown,
  isLoading,
  children,
}: DetailProps): ReactNode {
  if (isLoading) return <DetailLoading />;

  return (
    <View className="gap-4">
      {markdown ? <Text>{markdown}</Text> : null}
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
