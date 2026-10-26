// The content column's rule, written once: the Frame places the column from it, a measured host and the Session column read the same numbers.
export interface ContentRule {
  // A content column at least this wide draws the desktop Composer and cards.
  wideMin: number;
  // The column's widest, without its gutters.
  maximum: number;
  // Each side's margin in a wide window, and the narrower one below it.
  gutter: number;
  phoneGutter: number;
}

interface Span {
  offset: number;
  width: number;
}

export const isContentWide = (width: number, rule: ContentRule): boolean =>
  width >= rule.wideMin;

// A page's content column: the maximum and its two gutters, centred in the page.
export function contentSpan(
  page: Span,
  rule: Pick<ContentRule, 'maximum' | 'gutter'>,
): Span {
  const width = Math.min(page.width, rule.maximum + rule.gutter * 2);

  return { offset: page.offset + (page.width - width) / 2, width };
}

/*
 * Whether the column a Frame placed draws wide. A page that is hidden has no width, and keeps what it drew
 * last, so its content does not change while it folds away.
 */
export const placedContentWide = (
  width: number,
  rule: ContentRule,
  held?: boolean,
): boolean | undefined => (width > 0 ? isContentWide(width, rule) : held);

// The column's side margin at the window's Size class.
export const columnGutter = (rule: ContentRule, wide: boolean): number =>
  wide ? rule.gutter : rule.phoneGutter;
