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

// A sidebar's groups head their flat rows with a muted heading, inset as the rows' content.
const sidebar = {
  heading: muted,
  title: muted,
  footer: muted,
  inset: 'px-2',
  gap: 'pb-2',
  below: 'h-4',
} satisfies SectionDrawing;

const phoneMuted = 'text-tone-neutral-600';

// A phone's grouped List draws its headers and footers on the grouped grey in neutral-600, the shade that keeps AA there.
const phoneGrouped = {
  heading: phoneMuted,
  title: phoneMuted,
  footer: phoneMuted,
  ...rowInset,
} satisfies SectionDrawing;

const plain = {
  heading: muted,
  footer: muted,
  ...rowInset,
} satisfies SectionDrawing;

// A compact List's rows keep 10 from their edge (Paper "Issue row"), so its heading starts there, on its rows' leading marks.
export const compactSection = (section: SectionDrawing): SectionDrawing => ({
  ...section,
  inset: 'px-2.5',
});

// A popover's section heading starts where its rows' icons do: the row's 8 padding in from the card's inset.
const menu = { ...plain, inset: 'px-2' } satisfies SectionDrawing;

// A choosing popover's rows keep a lane for the check (16) and a gap (8) before the text, and its heading starts with that text.
const choosingMenu = { ...menu, inset: 'pl-8 pr-2' } satisfies SectionDrawing;

export interface SectionCase {
  menu: boolean;
  sidebar: boolean;
  phone: boolean;
}

export interface SectionDrawings {
  section: SectionDrawing;
  // The drawing inside a popover whose sections choose; the same as `section` anywhere else.
  choosingSection: SectionDrawing;
}

const drawn = (
  section: SectionDrawing,
  choosingSection: SectionDrawing = section,
): SectionDrawings => ({ section, choosingSection });

const rows = (state: SectionCase): SectionDrawings =>
  drawn(state.phone ? phoneGrouped : plain);

const popover = (state: SectionCase): SectionDrawings =>
  state.menu ? drawn(menu, choosingMenu) : rows(state);

export const sectionDrawings = (state: SectionCase): SectionDrawings =>
  state.sidebar ? drawn(sidebar) : popover(state);
