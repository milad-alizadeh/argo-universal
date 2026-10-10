import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import * as React from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { NativeOnlyAnimatedView } from '#primitives/native-only-animated-view';
import { TextClassContext } from '#primitives/text';
import {
  dropdownContentClassName,
  dropdownOverlayStyle,
} from './dropdown-menu-styles';

type ContentProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Content
> & {
  overlayStyle?: StyleProp<ViewStyle>;
  overlayClassName?: string;
  portalHost?: string;
};
const FullWindowOverlay =
  Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;
const entering = FadeIn.reduceMotion(ReduceMotion.System);

function ContentBody({
  className,
  ...props
}: React.ComponentProps<
  typeof DropdownMenuPrimitive.Content
>): React.JSX.Element {
  return (
    <TextClassContext.Provider value="text-popover-foreground">
      <DropdownMenuPrimitive.Content
        className={dropdownContentClassName({ className, side: props.side })}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function contentOverlayProps(
  props: ContentProps,
): React.ComponentProps<typeof DropdownMenuPrimitive.Overlay> {
  return {
    style: dropdownOverlayStyle(props.overlayStyle),
    className: props.overlayClassName,
    asChild: Platform.OS !== 'web',
  };
}

function ContentOverlay(
  contentProps: Omit<ContentProps, 'portalHost'>,
): React.JSX.Element {
  return (
    <FullWindowOverlay>
      <AnimatedContentOverlay {...contentProps} />
    </FullWindowOverlay>
  );
}

function AnimatedContentOverlay(
  contentProps: Omit<ContentProps, 'portalHost'>,
): React.JSX.Element {
  const { overlayClassName, overlayStyle, ...props } = contentProps;
  const overlayProps = contentOverlayProps({ overlayClassName, overlayStyle });
  return (
    <DropdownMenuPrimitive.Overlay {...overlayProps}>
      <NativeOnlyAnimatedView entering={entering} as="Pressable">
        <ContentBody {...props} />
      </NativeOnlyAnimatedView>
    </DropdownMenuPrimitive.Overlay>
  );
}

export function DropdownMenuContent({
  portalHost,
  ...props
}: ContentProps): React.JSX.Element {
  return (
    <DropdownMenuPrimitive.Portal hostName={portalHost}>
      <ContentOverlay {...props} />
    </DropdownMenuPrimitive.Portal>
  );
}
