import { type ComponentRef, type ReactElement, useRef } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { SkeletonLoadingContext } from './skeleton-loading';
import { overlayAttribute } from './skeleton-marks';
import type { SkeletonPlaceholder } from './skeleton-placeholder';
import type { SkeletonProps } from './skeleton-props';
import { useSkeletonPlaceholders } from './skeleton-web-measure';

const markOverlay = (node: ComponentRef<typeof View> | null): void => {
  if (node instanceof Element) node.setAttribute(overlayAttribute, '');
};

const fillClass = (props: SkeletonProps): string | undefined =>
  props.fill ? 'flex-1' : undefined;

// A loading Skeleton is a busy status, named by what the page is waiting for.
const busyProps = (props: SkeletonProps): ViewProps =>
  props.loading
    ? {
        role: 'status',
        'aria-busy': true,
        'aria-label': props.accessibilityLabel,
      }
    : {};

// React Native Web's View is already the positioning context the overlay needs, so the wrapper adds no style.
const rootProps = (props: SkeletonProps): ViewProps => ({
  className: fillClass(props),
  testID: props.testID,
  ...busyProps(props),
});

const keyOf = (placeholder: SkeletonPlaceholder): string =>
  `${placeholder.left},${placeholder.top},${placeholder.width},${placeholder.height}`;

const frameOf = (placeholder: SkeletonPlaceholder): ViewStyle => ({
  left: placeholder.left,
  top: placeholder.top,
  width: placeholder.width,
  height: placeholder.height,
  borderRadius: placeholder.radius,
});

const pulseOf = (animation: SkeletonProps['animation']): string =>
  animation === 'none' ? '' : 'motion-safe:animate-pulse';

function Placeholder(props: {
  placeholder: SkeletonPlaceholder;
}): ReactElement {
  return (
    <View
      className="absolute bg-foreground/15"
      style={frameOf(props.placeholder)}
    />
  );
}

interface PlaceholdersProps {
  placeholders: SkeletonPlaceholder[];
  animation: SkeletonProps['animation'];
}

function Placeholders(props: PlaceholdersProps): ReactElement {
  return (
    <View
      ref={markOverlay}
      aria-hidden
      pointerEvents="none"
      className={`absolute inset-0 ${pulseOf(props.animation)}`}
    >
      {props.placeholders.map((placeholder) => (
        <Placeholder key={keyOf(placeholder)} placeholder={placeholder} />
      ))}
    </View>
  );
}

/*
 * Works out its placeholders from what its children draw (skeleton-dom.ts). The wrapper is a busy status while
 * loading, and what it hid is aria-hidden; an ignored subtree stays as drawn and as read.
 */
export function Skeleton(props: SkeletonProps): ReactElement {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const placeholders = useSkeletonPlaceholders(ref, props.loading);

  return (
    <View ref={ref} {...rootProps(props)}>
      <SkeletonLoadingContext value={props.loading}>
        {props.children}
      </SkeletonLoadingContext>
      {props.loading && (
        <Placeholders placeholders={placeholders} animation={props.animation} />
      )}
    </View>
  );
}
