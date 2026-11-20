import type { FieldPickerMeter } from './field-picker-model';

// A level that holds still, so a story draws the same glyph every time.
export const fixedMeter = (level: number): FieldPickerMeter => ({
  level: () => level,
  subscribe: () => () => {},
});
