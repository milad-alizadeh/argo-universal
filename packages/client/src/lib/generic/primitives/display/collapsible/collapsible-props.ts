import type { ComponentProps, ReactNode } from 'react';
import type { View } from 'react-native';
import type { Tone } from '#primitives/display/text';
import type { OpenStateProps } from '#primitives/overlays/open-state';
import type { IconName } from '../../../symbols/icon-names';

export type CollapsibleProps = ComponentProps<typeof View> &
  OpenStateProps & {
    // Its trigger stops toggling it.
    disabled?: boolean;
  };

export type CollapsibleContentProps = ComponentProps<typeof View> & {
  // Web only: keeps the closed content mounted, for content that animates its own height.
  forceMount?: true;
};

export interface CollapsibleHeaderProps {
  // Names the trigger for assistive technology, and is its text unless children replace it.
  label: string;
  icon?: IconName;
  // Colours the icon; the label and chevron keep the header's colour.
  iconTone?: Tone;
  // Replaces the label text, between the icon and the chevron; hover is read with useCollapsibleHovered.
  children?: ReactNode;
}
