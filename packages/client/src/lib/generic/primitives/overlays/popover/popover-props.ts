import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { TriggerElement } from '#primitives/overlays/open-state';
import type { KitProps } from '../../kit-props';

export type PopoverProps = KitProps<'Popover'> & {
  // Web only: phones have no pointer to hover with, so a press opens it.
  openOnHover?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

// The caller's own pressable element, which opens the popover.
export type PopoverTriggerProps = {
  disabled?: boolean | null;
  children: TriggerElement;
};

/*
 * Placement and look are the web popover's: phones show the content in a Sheet, which keeps its own
 * placement, width and padding.
 */
export type PopoverContentProps = {
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  // Along the side, from the aligned edge; negative moves it back past that edge.
  alignOffset?: number;
  // The popover's accessible name; a phone's Sheet takes it as its label.
  accessibilityLabel?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  // Web only: where focus goes as the popover opens and after it closes.
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  // After the popover has closed.
  onClosed?: () => void;
  // Web only: Escape, just before the popover closes.
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  children?: ReactNode;
};
