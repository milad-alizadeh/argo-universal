/*
 * The one box a row's leading mark draws in: an Agent's logo, a tinted avatar, a Workbench card's mark. 28pt is the
 * plate stock iOS Settings draws a row's icon on (measured 28pt on an iPhone @3x), on a phone and a desktop window alike.
 */
export const leadingMarkClass = 'size-7';

// The same box in points, for the arithmetic that sits beside it; keep it equal to `leadingMarkClass`.
export const leadingMarkPixels = 28;
