import type { ComponentProps, ReactNode } from 'react';
import type { View } from 'react-native';
import type { Tone } from '#primitives/content/text';
import type { IconName } from '../../../symbols/icon-names';
import type { KitProps } from '../../kit-props';

// Kit-only: native view attributes.
export type CollapsibleProps = KitProps<'Collapsible'> &
  Omit<ComponentProps<typeof View>, keyof KitProps<'Collapsible'>>;

export type CollapsibleContentProps = ComponentProps<typeof View> & {
  // Web only: keeps the closed content mounted, for content that animates its own height.
  forceMount?: true;
};

export interface CollapsibleHeaderProps {
  // Names the trigger for assistive technology, and is its text unless children replace it.
  label: string;
  icon?: IconName;
  // Replaces the icon with a drawn glyph, for a status the icon names cannot draw.
  leading?: ReactNode;
  // Colours the icon; the label and chevron keep the header's colour.
  iconTone?: Tone;
  // Replaces the label text, between the icon and the chevron; hover is read with useCollapsibleHovered.
  children?: ReactNode;
}
