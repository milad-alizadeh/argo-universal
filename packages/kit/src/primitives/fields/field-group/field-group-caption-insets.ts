import type { NativeTextRole } from '#primitives/content/native-text';

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
