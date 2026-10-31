/*
 * How wide each column of a Markdown pipe table wants to be. A pipe table names no widths, so the text decides: a
 * column of numbers stays a column of numbers, and a column of prose gets the room left over.
 */

// A column's share and the width it never goes under, in the Table's own terms.
export interface ColumnWidth {
  grow: number;
  minWidth: number;
}

/*
 * The text is measured in characters, which is all a table token gives. A column shorter than `leastChars` still holds
 * its heading; one longer than `mostChars` is prose, and prose past that point wraps rather than widens.
 */
const leastChars = 6;

const mostChars = 44;

// The characters a column keeps room for before it wraps, and the average width of one at body size.
const keptChars = 18;

const charWidth = 8.5;

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

const longest = (texts: readonly string[]): number =>
  texts.reduce((most, text) => Math.max(most, text.trim().length), 0);

// One column's width from every line of text in it, its heading included.
export function columnWidth(texts: readonly string[]): ColumnWidth {
  const chars = clamp(longest(texts), leastChars, mostChars);

  return {
    grow: chars,
    minWidth: Math.round(Math.min(chars, keptChars) * charWidth),
  };
}

// Each column's width, from the table's cells read column by column. A row with missing cells counts as empty there.
export function columnWidths(
  rows: readonly (readonly string[])[],
): ColumnWidth[] {
  const columns = rows.reduce((most, row) => Math.max(most, row.length), 0);

  return Array.from({ length: columns }, (_, column) =>
    columnWidth(rows.map((row) => row[column] ?? '')),
  );
}
