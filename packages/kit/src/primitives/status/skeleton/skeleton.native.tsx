import { requireNativeView } from 'expo';
import type { ReactElement } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { HostRedactionContext } from '#primitives/native/host';
import { usePrimitiveColor } from '#primitives/native/primitive-color';
import { SkeletonLoadingContext } from './skeleton-loading';
import type { SkeletonProps } from './skeleton-props';

interface NativeSkeletonProps extends ViewProps {
  loading: boolean;
  animation: 'pulse' | 'none';
  // The placeholders' colour, resolved from the foreground token at 15%.
  color?: string;
}

const NativeSkeleton = requireNativeView<NativeSkeletonProps>('ArgoSkeleton');

/*
 * The Skeleton is a box that sizes to its children, as the web one does, so in a row it takes its content's width
 * and no more. Content that fills its parent (a FieldGroup or a List is a flex:1 Host) finds a box of no height and
 * draws nothing, so the caller says so with `fill`: whether the parent is a row or a column is
 * known only to the caller. The box is a View that takes the room when `fill` is set, and the native view fills it.
 */
const styles = StyleSheet.create({ fill: { flexGrow: 1, flexShrink: 1 } });

function NativeSkeletonView({
  animation = 'pulse',
  fill,
  ...rest
}: SkeletonProps): ReactElement {
  const color = usePrimitiveColor('text-foreground/15');
  const native = { style: styles.fill, animation, color };

  return (
    <View className={fill ? 'flex-1' : undefined}>
      <NativeSkeleton {...rest} {...native} />
    </View>
  );
}

/*
 * The native view (apps/universal-app/modules/argo-skeleton) walks the views under it while loading: text becomes
 * one bar per laid-out line, and an image, svg, field or small control becomes a bar of its size and radius. It
 * also hides every subtree it holds from TalkBack, bar a Skeleton.Ignore, so its own "Loading" is all that speaks.
 * Expo UI's SwiftUI content redacts itself instead (the kit Host reads the context below), and Compose content
 * is read through its semantics tree.
 */
export function Skeleton(props: SkeletonProps): ReactElement {
  return (
    <HostRedactionContext value={props.loading}>
      <SkeletonLoadingContext value={props.loading}>
        <NativeSkeletonView {...props} />
      </SkeletonLoadingContext>
    </HostRedactionContext>
  );
}
