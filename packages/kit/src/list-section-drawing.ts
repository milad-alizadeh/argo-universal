import { use } from 'react';
import { Platform } from 'react-native';
import { ListContext } from './list-context';
import { useInMenu } from './menu-rows-context';
import { useRowDrawing } from './row-drawing-context';

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
  // A title colour set after the heading role, which otherwise draws its own over the heading colour above.
  title?: string;
}

const muted = 'text-muted-foreground';

const phoneMuted = 'text-tone-neutral-600';

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
    heading: phoneMuted,
    title: phoneMuted,
    footer: phoneMuted,
    ...rowInset,
  },
  // Paper's List / Grouped on a page: a muted heading over the rows' text, 8 above the card; cards sit 16 apart.
  content: {
    heading: muted,
    title: muted,
    footer: muted,
    inset: 'px-5',
    gap: 'pb-2',
    below: 'h-4',
  },
  plain: { heading: muted, footer: muted, ...rowInset },
} satisfies Record<string, SectionDrawing>;

function groupedDrawing(content: boolean): SectionDrawing {
  if (Platform.OS !== 'web') return drawings.phone;

  return content ? drawings.content : drawings.card;
}

// Paper's SettingsList: a sidebar's groups head their flat rows as a page's grouped List does, inset as the rows.
export function useSectionDrawing(): SectionDrawing {
  const grouped = use(ListContext).appearance === 'grouped';
  const menu = useInMenu();
  const drawing = useRowDrawing();

  if (drawing === 'sidebar') return drawings.content;

  return listDrawing(grouped && !menu, drawing === 'content');
}

const listDrawing = (grouped: boolean, content: boolean): SectionDrawing =>
  grouped ? groupedDrawing(content) : drawings.plain;
