import { requireNativeView } from 'expo';
import type { ReactElement } from 'react';
import type { ViewProps } from 'react-native';
import { SkeletonRedactedContext } from './skeleton-context';
import type { SkeletonIgnoreProps } from './skeleton-props';

const NativeIgnore = requireNativeView<ViewProps>(
  'ArgoSkeleton',
  'ArgoSkeletonIgnoreView',
);

// The native walk skips this subtree, so it stays as drawn; a Host inside it is not redacted either.
export function SkeletonIgnore({
  children,
}: SkeletonIgnoreProps): ReactElement {
  return (
    <SkeletonRedactedContext value={false}>
      <NativeIgnore>{children}</NativeIgnore>
    </SkeletonRedactedContext>
  );
}
