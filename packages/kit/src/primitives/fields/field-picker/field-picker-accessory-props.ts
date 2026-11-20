import type { KitProps } from '../../kit-props';

// The App's own button at a picker row's end (ADR-0042, 2026-11-19).
export type FieldPickerAccessory = {
  icon: KitProps<'Icon'>['name'];
  // The button's spoken name, such as "Play Sol".
  label: string;
  onPress: () => void;
  // Not ready yet, such as a preview of a voice with no description.
  disabled?: boolean;
};

// A level from 0 to 1 that changes on its own: the glyph reads it whenever the source says it moved.
export type FieldPickerMeter = {
  level: () => number;
  subscribe: (onChange: () => void) => () => void;
};
