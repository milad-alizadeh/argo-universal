/*
 * The names of an icon's sizes. `Icon` and `IconButton` both take one, and the kit's glyph sizing module turns it into
 * pixels.
 */
export const iconSizes = ['sm', 'md', 'lg'] as const;

export type IconSize = (typeof iconSizes)[number];
