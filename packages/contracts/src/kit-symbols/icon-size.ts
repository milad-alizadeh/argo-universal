// Pixels an icon draws at: the glyph's size on a desktop window and on a phone.
type IconPixels = 16 | 20 | 24;

/*
 * The one table of icon sizes. `Icon` and `IconButton` both take a size from it, and nothing else holds an icon pixel
 * value. No glyph is under 16, where a desktop glyph stops reading. The phone steps one size up, to a limit of 24,
 * since its text is larger. Adjust the desktop column when the desktop font changes.
 */
export const iconSizes = {
  sm: { wide: 16, phone: 20 },
  md: { wide: 20, phone: 24 },
  lg: { wide: 24, phone: 24 },
} as const satisfies Record<string, Record<'wide' | 'phone', IconPixels>>;

export type IconSize = keyof typeof iconSizes;
