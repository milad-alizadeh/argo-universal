import type { ReactElement } from 'react';

export interface FieldListSection {
  title?: string;
  footer?: string;
  // The section's rows, ListItems with keys of their own.
  rows: readonly ReactElement[];
}

// One item of the flattened list; gapAbove marks the item that opens a section after another.
export type FieldListEntry =
  | { kind: 'title'; key: string; title: string; gapAbove: boolean }
  | {
      kind: 'row';
      key: string;
      row: ReactElement;
      first: boolean;
      last: boolean;
      gapAbove: boolean;
    }
  | { kind: 'footer'; key: string; footer: string; gapAbove: false };

type Placed = { section: FieldListSection; key: string; gapAbove: boolean };

const titleEntries = ({ section, key, gapAbove }: Placed): FieldListEntry[] =>
  section.title
    ? [{ kind: 'title', key: `${key}:title`, title: section.title, gapAbove }]
    : [];

const rowEntries = ({ section, key, gapAbove }: Placed): FieldListEntry[] => {
  const opensSection = gapAbove && !section.title;
  return section.rows.map((row, index) => ({
    kind: 'row',
    key: `${key}:${row.key ?? index}`,
    row,
    first: index === 0,
    last: index === section.rows.length - 1,
    gapAbove: opensSection && index === 0,
  }));
};

const footerEntries = ({ section, key }: Placed): FieldListEntry[] =>
  section.footer
    ? [
        {
          kind: 'footer',
          key: `${key}:footer`,
          footer: section.footer,
          gapAbove: false,
        },
      ]
    : [];

// A section as its title, its rows marked first and last, then its footer.
function sectionEntries(
  section: FieldListSection,
  index: number,
): FieldListEntry[] {
  const at = {
    section,
    key: section.title ?? `section-${index}`,
    gapAbove: index > 0,
  };
  return [...titleEntries(at), ...rowEntries(at), ...footerEntries(at)];
}

export const fieldListEntries = (
  sections: readonly FieldListSection[],
): FieldListEntry[] => sections.flatMap(sectionEntries);

export const fieldListEntryKey = (entry: FieldListEntry): string => entry.key;
export const fieldListEntryKind = (
  entry: FieldListEntry,
): FieldListEntry['kind'] => entry.kind;
