import { use } from 'react';
import { Platform } from 'react-native';
import { ListContext } from './list-context';
import { useInMenu } from './menu-rows-context';

export interface SectionDrawing {
  // The header label's colour, for its text and leading icon.
  heading: string;
  // The footer's colour, unless it reports a failure.
  footer: string;
  // The header's and footer's inset from the List's edge.
  inset: string;
  // The gap below the header, which belongs to its label so a toggle's press area runs down to the rows.
  gap: string;
  // The space after the section, before the next one.
  below: string;
}

const muted = 'text-muted-foreground';

// Inset as the rows' content.
const rowInset = { inset: 'px-4 wide:px-5', gap: 'pb-2', below: 'h-4' };

/*
 * Paper "Settings · Porcelain": a desktop or web grouped card's heading is the foreground, flush with the card, 12
 * above it, and cards sit 24 apart. Phones draw a grouped List's headers and footers on the grouped grey in
 * neutral-600, the shade that keeps AA there. Every other List keeps muted text.
 */
const drawings = {
  card: {
    heading: 'text-foreground',
    footer: muted,
    inset: '',
    gap: 'pb-3',
    below: 'h-6',
  },
  phone: {
    heading: 'text-tone-neutral-600',
    footer: 'text-tone-neutral-600',
    ...rowInset,
  },
  plain: { heading: muted, footer: muted, ...rowInset },
} satisfies Record<string, SectionDrawing>;

const groupedDrawing = Platform.OS === 'web' ? drawings.card : drawings.phone;

export function useSectionDrawing(): SectionDrawing {
  const grouped = use(ListContext).appearance === 'grouped';
  const menu = useInMenu();

  return grouped && !menu ? groupedDrawing : drawings.plain;
}
