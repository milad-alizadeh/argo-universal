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

// Inset as the rows' content.
const rowInset = { inset: 'px-4 wide:px-5', gap: 'pb-2', below: 'h-4' };

// Paper's SettingsList: a sidebar's groups head their flat rows with a muted heading, inset as the rows.
const sidebar = {
  heading: muted,
  title: muted,
  footer: muted,
  inset: 'px-5',
  gap: 'pb-2',
  below: 'h-4',
} satisfies SectionDrawing;

const plain = {
  heading: muted,
  footer: muted,
  ...rowInset,
} satisfies SectionDrawing;

export function useSectionDrawing(): SectionDrawing {
  return useRowDrawing() === 'sidebar' ? sidebar : plain;
}
