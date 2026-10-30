import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { IconButton } from '#primitives/actions/icon-button';
import {
  type SearchFieldGeometry,
  useCloseStyle,
  useRestStyle,
  useSurfaceStyle,
  useTextStyle,
} from './search-field-motion';
import type { LayoutHandler } from './search-field-props';

export interface MorphState {
  open: boolean;
  progress: SharedValue<number>;
  geometry: SearchFieldGeometry;
  // A sidebar's search draws the 16 control glyph.
  sidebar?: boolean;
}

export type RestRowProps = MorphState & {
  title: ReactNode;
  actions?: ReactNode;
};

type RestGroupProps = Pick<MorphState, 'open' | 'progress'> & {
  className: string;
  onLayout?: LayoutHandler;
  children: ReactNode;
};

// What the field covers when it opens: it fades, and leaves the accessibility tree.
function RestGroup(props: RestGroupProps): React.JSX.Element {
  return (
    <Animated.View
      aria-hidden={props.open}
      accessibilityElementsHidden={props.open}
      inert={props.open}
      className={props.className}
      onLayout={props.onLayout}
      style={useRestStyle(props.progress)}
    >
      {props.children}
    </Animated.View>
  );
}

// The title and other actions; a sidebar draws its actions after the search button instead.
export function RestRow(props: RestRowProps): React.JSX.Element {
  return (
    <RestGroup
      {...props}
      className="min-w-0 flex-1 flex-row items-center gap-1"
    >
      <View className="min-w-0 flex-1">{props.title}</View>
      {props.sidebar ? null : props.actions}
    </RestGroup>
  );
}

// Whether the row draws its actions after the search button rather than beside the title.
export const hasTrailingActions = (
  props: Pick<RestRowProps, 'sidebar' | 'actions'>,
): boolean => Boolean(props.sidebar && props.actions);

/*
 * A sidebar's actions, after its search button; they leave with the title. The group reports its own width, which is
 * what the search button sits in from the row's end.
 */
export function TrailingActions(
  props: RestRowProps & { onLayout: LayoutHandler },
): ReactNode {
  if (!hasTrailingActions(props)) return null;

  return (
    <RestGroup {...props} className="shrink-0 flex-row items-center gap-1">
      {props.actions}
    </RestGroup>
  );
}

type OpenFieldProps = MorphState & { onClose: () => void; children: ReactNode };

type HiddenProps = Pick<
  React.ComponentProps<typeof View>,
  | 'pointerEvents'
  | 'aria-hidden'
  | 'accessibilityElementsHidden'
  | 'importantForAccessibility'
  | 'inert'
>;

const hiddenUnlessOpen = (open: boolean): HiddenProps => ({
  pointerEvents: open ? 'box-none' : 'none',
  'aria-hidden': !open,
  accessibilityElementsHidden: !open,
  importantForAccessibility: open ? 'auto' : 'no-hide-descendants',
  inert: !open,
});

// The surface, the query and Close, hidden and inert until the field opens.
export function OpenField(props: OpenFieldProps): React.JSX.Element {
  return (
    <View {...hiddenUnlessOpen(props.open)} className="absolute inset-0">
      <Animated.View
        className="absolute inset-y-0 right-0 rounded-2xl web:rounded-control bg-muted"
        style={useSurfaceStyle(props.progress, props.geometry)}
      />
      <QueryLayer progress={props.progress}>{props.children}</QueryLayer>
      <CloseButton progress={props.progress} onClose={props.onClose} />
    </View>
  );
}

function QueryLayer(props: {
  progress: SharedValue<number>;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Animated.View
      className="absolute inset-0"
      style={useTextStyle(props.progress)}
    >
      {props.children}
    </Animated.View>
  );
}

type CloseButtonProps = {
  progress: SharedValue<number>;
  onClose: () => void;
};

function CloseButton(props: CloseButtonProps): React.JSX.Element {
  return (
    <Animated.View
      className="absolute right-1 top-1"
      style={useCloseStyle(props.progress)}
    >
      <CloseIconButton onClose={props.onClose} />
    </Animated.View>
  );
}

function CloseIconButton(
  props: Pick<CloseButtonProps, 'onClose'>,
): React.JSX.Element {
  return (
    <IconButton
      icon="close"
      variant="ghost"
      accessibilityLabel="Close search"
      onPress={props.onClose}
    />
  );
}
