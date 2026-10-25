import type { ComponentRef, ReactElement } from 'react';
import { View } from 'react-native';
import { SkeletonRedactedContext } from './skeleton-context';
import { ignoreAttribute } from './skeleton-marks';
import type { SkeletonIgnoreProps } from './skeleton-props';

const markIgnored = (node: ComponentRef<typeof View> | null): void => {
  if (node instanceof Element) node.setAttribute(ignoreAttribute, '');
};

// What a Skeleton walks skips this subtree: it stays as drawn, and so does what assistive technology reads of it.
export function SkeletonIgnore({
  children,
}: SkeletonIgnoreProps): ReactElement {
  return (
    <SkeletonRedactedContext value={false}>
      <View ref={markIgnored}>{children}</View>
    </SkeletonRedactedContext>
  );
}
