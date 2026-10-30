import { requireNativeView } from 'expo';
import type { ReactElement } from 'react';
import type { ViewProps } from 'react-native';
import { HostRedactionContext } from '#primitives/native/host';
import { SkeletonLoadingContext } from './skeleton-loading';
import type { SkeletonIgnoreProps } from './skeleton-props';

const NativeIgnore = requireNativeView<ViewProps>(
  'ArgoSkeleton',
  'ArgoSkeletonIgnoreView',
);

// The native walk skips this subtree, so it stays as drawn, placeholders and all; a Host inside it is not redacted either.
export function SkeletonIgnore({
  children,
}: SkeletonIgnoreProps): ReactElement {
  return (
    <HostRedactionContext value={false}>
      <SkeletonLoadingContext value={false}>
        <NativeIgnore>{children}</NativeIgnore>
      </SkeletonLoadingContext>
    </HostRedactionContext>
  );
}
