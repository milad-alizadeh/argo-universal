import type { ComponentProps, ReactElement } from 'react';
import type { Pressable } from 'react-native';
import type { KitProps } from '../../kit-props';
import { WebIconButton } from './icon-button-web';

// What a Plugin sends for an IconButton over the wire.
export type IconButtonDataProps = KitProps<'IconButton'>;

/*
 * `muted` is for the app's own screens, not the wire: a ghost glyph in the secondary tone, as an Icon's muted tone.
 * The rest of a Pressable's props pass through on the web, since a Radix trigger clones its child with handlers and aria state.
 */
export type IconButtonProps = IconButtonDataProps & {
  testID?: string;
  muted?: boolean;
  // A glyph in the theme's danger red, as a control that is on and warns, such as a muted microphone.
  danger?: boolean;
  // On the web, a 28 box on a line of 28 controls, such as the Composer's beside its Pills.
  control?: boolean;
} & Omit<
    ComponentProps<typeof Pressable>,
    keyof IconButtonDataProps | 'children' | 'style' | 'className' | 'ref'
  >;

export type { IconButtonSize } from '@repo/contracts/kit-tokens';

// The plain file is the web and Electron drawing; iOS and Android live in the `.ios` and `.android` files (ADR-0020).
export function IconButton(props: IconButtonProps): ReactElement {
  return <WebIconButton {...props} />;
}
