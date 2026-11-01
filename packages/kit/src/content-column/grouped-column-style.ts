import type { ContentColumn } from './column-layout';

export interface GroupedColumnStyle {
  width?: '100%';
  maxWidth?: number;
  alignSelf?: 'center';
  paddingLeft?: number;
  paddingRight?: number;
}

// Expo's own content padding in a FieldGroup, which the column's gutter gives up.
const fieldGroupPadding = 16;

/*
 * A grouped FieldGroup's column: the group scrolls itself and takes no content style, so its own view is the column,
 * capped and centred as every wide page's content is. Its cards' edges start on the page title's line.
 */
export function fieldGroupColumnStyle(
  column?: ContentColumn,
): GroupedColumnStyle {
  if (!column) return {};

  return {
    width: '100%',
    maxWidth: column.maxWidth,
    alignSelf: 'center',
    paddingLeft: Math.max(0, column.paddingLeft - fieldGroupPadding),
    paddingRight: Math.max(0, column.paddingRight - fieldGroupPadding),
  };
}
