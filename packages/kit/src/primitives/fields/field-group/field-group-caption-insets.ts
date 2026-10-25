import type { NativeTextRole } from '#primitives/content/native-text';

/*
 * Expo UI's Android FieldGroup layout, shared by the FieldGroup and the grouped List's column: 16dp around, 2dp
 * between rows, 24dp between sections. A section break is an item of its own in a column spaced by the rows' 2dp,
 * so it makes up the rest.
 */
export const rowSpacing = 2;

export const sectionBreakHeight = 24 - 2 * rowSpacing;

export const contentPadding = { start: 16, end: 16, top: 16, bottom: 16 };

/*
 * A section's title or footer as Expo UI's Android FieldGroup.Section draws it (FieldSection.android.tsx): 16dp in,
 * the title 8dp above its rows, the footer 4dp below them, in the kit's type role.
 */
export const titleInsets = { start: 16, top: 0, end: 16, bottom: 8 };

export const footerInsets = { start: 16, top: 4, end: 16, bottom: 0 };

export type Insets = typeof titleInsets;

export type CaptionProps = {
  text: string | undefined;
  insets: Insets;
  role: NativeTextRole;
};

export const caption = (
  text: string | undefined,
  insets: Insets,
  role: NativeTextRole,
): CaptionProps => ({ text, insets, role });
