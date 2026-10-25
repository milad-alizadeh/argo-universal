import { type ComponentRef, type ReactElement, useRef } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { SkeletonRedactedContext } from './skeleton-context';
import { overlayAttribute } from './skeleton-marks';
import type { SkeletonPlaceholder } from './skeleton-placeholder';
import type { SkeletonProps } from './skeleton-props';
import { useSkeletonPlaceholders } from './skeleton-web-measure';

const markOverlay = (node: ComponentRef<typeof View> | null): void => {
  if (node instanceof Element) node.setAttribute(overlayAttribute, '');
};

const busy: ViewProps = { role: 'status', 'aria-busy': true };

const rootProps = (props: SkeletonProps): ViewProps => ({
  testID: props.testID,
  className: 'relative flex-1',
  role: props.loading ? busy.role : undefined,
  'aria-busy': props.loading ? busy['aria-busy'] : undefined,
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
      className="absolute bg-foreground/5"
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

function SkeletonContent(props: SkeletonProps): ReactElement {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const placeholders = useSkeletonPlaceholders(ref, props.loading);

  return (
    <View ref={ref} {...rootProps(props)}>
      {props.children}
      {props.loading && (
        <Placeholders placeholders={placeholders} animation={props.animation} />
      )}
    </View>
  );
}

/*
 * Works out its placeholders from what its children draw (skeleton-dom.ts). The wrapper is a busy status while
 * loading, and what it hid is aria-hidden; an ignored subtree stays as drawn and as read.
 */
export function Skeleton(props: SkeletonProps): ReactElement {
  return (
    <SkeletonRedactedContext value={props.loading}>
      <SkeletonContent {...props} />
    </SkeletonRedactedContext>
  );
}
