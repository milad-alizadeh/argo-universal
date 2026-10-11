import * as SelectPrimitive from '@rn-primitives/select';
import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { Icon } from '#lib/generic/primitives/icon';
import { NativeOnlyAnimatedView } from '#lib/generic/primitives/native-only-animated-view';
import { TextClassContext } from '#lib/generic/primitives/text';
import {
  selectContentClassName,
  selectViewportClassName,
} from './select-styles';

type ContentProps = React.ComponentProps<typeof SelectPrimitive.Content> & {
  className?: string;
  portalHost?: string;
};
const FullWindowOverlay =
  Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;
const animationProps = {
  className: 'z-50',
  entering: FadeIn.reduceMotion(ReduceMotion.System),
  exiting: FadeOut.reduceMotion(ReduceMotion.System),
  as: 'Pressable',
} as const;
const overlayProps = {
  style: Platform.select({ native: StyleSheet.absoluteFill }),
  asChild: Platform.OS !== 'web',
};
const scrollClassName = 'flex cursor-default items-center justify-center py-1';

const scrollButtons = {
  up: { Component: SelectPrimitive.ScrollUpButton, icon: 'chevron-up' },
  down: { Component: SelectPrimitive.ScrollDownButton, icon: 'chevron-down' },
} as const;

function ScrollButton({
  direction,
}: {
  direction: 'up' | 'down';
}): React.JSX.Element | null {
  if (Platform.OS !== 'web') return null;
  const { Component, icon } = scrollButtons[direction];
  return (
    <Component className={scrollClassName}>
      <Icon size="xs" name={icon} />
    </Component>
  );
}

function SelectViewport({
  position,
  children,
}: Pick<ContentProps, 'position' | 'children'>): React.JSX.Element {
  return (
    <>
      <ScrollButton direction="up" />
      <SelectPrimitive.Viewport className={selectViewportClassName(position)}>
        {children}
      </SelectPrimitive.Viewport>
      <ScrollButton direction="down" />
    </>
  );
}

function ContentBody(contentProps: ContentProps): React.JSX.Element {
  const { className, children, position = 'popper', ...props } = contentProps;
  const contentStyle = selectContentClassName({
    className,
    position,
    side: props.side,
  });
  return React.createElement(
    SelectPrimitive.Content,
    { ...props, className: contentStyle, position },
    <SelectViewport position={position}>{children}</SelectViewport>,
  );
}

function ContentOverlay(props: ContentProps): React.JSX.Element {
  return (
    <FullWindowOverlay>
      <SelectPrimitive.Overlay {...overlayProps}>
        <NativeOnlyAnimatedView {...animationProps}>
          <TextClassContext.Provider value="text-popover-foreground">
            <ContentBody {...props} />
          </TextClassContext.Provider>
        </NativeOnlyAnimatedView>
      </SelectPrimitive.Overlay>
    </FullWindowOverlay>
  );
}

export function SelectContent({
  portalHost,
  ...props
}: ContentProps): React.JSX.Element {
  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <ContentOverlay {...props} />
    </SelectPrimitive.Portal>
  );
}
