import type { ComponentRef, ReactElement } from 'react';
import { View } from 'react-native';
import { SkeletonLoadingContext } from './skeleton-loading';
import { ignoreAttribute } from './skeleton-marks';
import type { SkeletonIgnoreProps } from './skeleton-props';

const markIgnored = (node: ComponentRef<typeof View> | null): void => {
  if (node instanceof Element) node.setAttribute(ignoreAttribute, '');
};

// What a Skeleton walks skips this subtree: it stays as drawn, placeholders and all, and so does what assistive technology reads of it.
export function SkeletonIgnore({
  children,
}: SkeletonIgnoreProps): ReactElement {
  return (
    <View ref={markIgnored} className="contents">
      <SkeletonLoadingContext value={false}>{children}</SkeletonLoadingContext>
    </View>
  );
}
