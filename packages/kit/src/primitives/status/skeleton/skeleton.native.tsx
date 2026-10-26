import { requireNativeView } from 'expo';
import type { ReactElement } from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
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

/*
 * The native view sizes to its children, so content that fills its parent (a FieldGroup or a List is a flex:1 Host)
 * would find a parent of no height and draw nothing. Growing into the room its parent has left, and shrinking
 * with it, hands that content a height and costs content that sizes itself nothing: it is as tall as it was.
 */
const styles = StyleSheet.create({ fill: { flexGrow: 1, flexShrink: 1 } });

function NativeSkeletonView({
  animation = 'pulse',
  ...rest
}: SkeletonProps): ReactElement {
  const color = usePrimitiveColor('text-foreground/15');

  return (
    <NativeSkeleton
      {...rest}
      style={styles.fill}
      animation={animation}
      color={color}
    />
  );
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
