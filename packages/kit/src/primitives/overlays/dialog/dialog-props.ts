import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import type { TriggerElement } from '#primitives/overlays/open-state';
import type { KitProps } from '../../kit-props';

export type DialogProps = KitProps<'Dialog'>;

// The caller's own pressable element, which opens the dialog.
export type DialogTriggerProps = {
  children: TriggerElement;
};

// Only what both the centred dialog and the narrow window's sheet honour.
export type DialogContentProps = {
  className?: string;
  // Names a dialog that has no DialogTitle of its own.
  accessibilityLabel?: string;
  // False while the content holds unsaved input: only its own actions close it.
  dismissible?: boolean;
  showClose?: boolean;
  // A centred dialog's width: `sm` for a short form of one or two fields, such as a rename.
  size?: 'sm' | 'md';
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
};

export type DialogTextProps = {
  className?: string;
  children?: ReactNode;
};

export interface DialogRegionProps {
  hostName?: string;
  label: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  bottomInset?: number;
}

export type DialogSheetProps = {
  open?: boolean;
  label?: string;
  dismissible?: boolean;
  // The sheet's whole content is one FieldGroup, which scrolls itself.
  fields?: boolean;
  // Pinned under the page, in view at any height.
  footer?: ReactNode;
  children: ReactNode;
};

// The parts each platform draws a dialog from: Radix on the web, React Native views on phones.
export type DialogRootProps = DialogProps & {
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export type DialogFrameProps = Omit<
  DialogContentProps,
  'dismissible' | 'showClose'
> & {
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
};

export type DialogBackdropProps = Pick<PressableProps, 'onPress'> & {
  className: string;
  children: ReactNode;
};

export interface DialogPresentation {
  centred: boolean;
  sheetOpen: boolean;
}
