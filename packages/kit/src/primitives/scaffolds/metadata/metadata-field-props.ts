import type { ReactElement, ReactNode } from 'react';
import type { PillProps } from '#primitives/status/pill';

/*
 * What a field shows when it draws as one Pill: the glyph before its value, where its press goes, and whether the
 * value stays in words when a narrow window shows glyphs alone (a status says itself, a dot alone does not).
 */
export interface MetadataFace {
  glyph?: ReactElement;
  onPress?: () => void;
  keepsText?: boolean;
  // A Pills field's own label Pills.
  pills?: PillProps[];
}

export interface MetadataFieldProps {
  title: string;
  // What the value says, for the field's spoken label.
  valueLabel: string;
  accessibilityLabel?: string;
  // Whether the field reads as one element; a Link value stays its own, so it can be focused and activated.
  grouped?: boolean;
  face: MetadataFace;
  // The read-only value as a row draws it: text, or text beside an icon, dot, avatar or Pills.
  children: ReactNode;
}

export type FieldProps = MetadataFieldProps & { label: string };
