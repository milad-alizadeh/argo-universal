import { requireNativeView } from 'expo';
import type { ReactElement } from 'react';
import type { ViewProps } from 'react-native';
import { HostRedactionContext } from '#primitives/native/host';
import { usePrimitiveColor } from '#primitives/native/primitive-color';
import type { SkeletonProps } from './skeleton-props';

interface NativeSkeletonProps extends ViewProps {
  loading: boolean;
  animation: 'pulse' | 'none';
  // The placeholders' colour, resolved from the foreground token at 15%.
  color?: string;
}

const NativeSkeleton = requireNativeView<NativeSkeletonProps>('ArgoSkeleton');

function NativeSkeletonView({
  animation = 'pulse',
  ...rest
}: SkeletonProps): ReactElement {
  const color = usePrimitiveColor('text-foreground/15');

  return <NativeSkeleton {...rest} animation={animation} color={color} />;
}

/*
 * The native view (apps/universal-app/modules/argo-skeleton) walks the views under it while loading: text becomes
 * one bar per laid-out line, and an image, svg, field or small control becomes a bar of its size and radius.
 * Expo UI's SwiftUI content redacts itself instead (the kit Host reads the context below), and Compose content
 * is read through its semantics tree.
 */
export function Skeleton(props: SkeletonProps): ReactElement {
  return (
    <HostRedactionContext value={props.loading}>
      <NativeSkeletonView {...props} />
    </HostRedactionContext>
  );
}
