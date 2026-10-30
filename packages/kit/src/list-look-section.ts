export interface SectionDrawing {
  // The header label's colour, for its text and leading icon.
  heading: string;
  // The footer's colour, unless it reports a failure.
  footer: string;
  // The header's and footer's one inset from the List's edge.
  inset: string;
  // The gap below the header, which belongs to its label so a toggle's press area runs down to the rows.
  gap: string;
  // What the header adds under itself.
  headingBelow: string;
  // The space after the section, before the next one.
  below: string;
  // A title colour set after the heading role, which otherwise draws its own over the heading colour above.
  title?: string;
}

const muted = 'text-muted-foreground';

// Inset as the rows' content: 16, 20 on a wide window.
const rowInset = {
  inset: 'px-4 wide:px-5',
  gap: 'pb-2',
  headingBelow: '',
  below: 'h-4',
};

// A sidebar's groups head their flat rows with a muted heading, inset as the rows' content.
const sidebar = {
  heading: muted,
  title: muted,
  footer: muted,
  inset: 'px-2',
  gap: 'pb-2',
  headingBelow: '',
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

// A web card's heading and footer start on its rows' text, 16 in at every width.
const webCard = { ...plain, inset: 'px-4', headingBelow: 'pb-1' };

// A compact List's rows keep 10 from their edge (Paper "Issue row"), so its heading starts there, on its rows' leading marks. A web card's own inset beats it.
const compactRows = { ...plain, inset: 'px-2.5' };

// A popover's section heading starts where its rows' icons do: the row's 8 padding in from the card's inset.
const menu = { ...plain, inset: 'px-2' } satisfies SectionDrawing;

// A choosing popover's rows keep a lane for the check (16) and a gap (8) before the text, and its heading starts with that text.
const choosingMenu = { ...menu, inset: 'pl-8 pr-2' } satisfies SectionDrawing;

export interface SectionCase {
  menu: boolean;
  // A Detail's content column: a block's heading starts on the column's edge, with the page's title and its body.
  padded: boolean;
  sidebar: boolean;
  choosing: boolean;
  // The List's rows draw as one line.
  compact: boolean;
  webGrouped: boolean;
  phone: boolean;
}

// A compact List's rows keep their leading edge in, which a web card's heading overrides with its own.
const compactable = (state: SectionCase): SectionDrawing =>
  state.webGrouped ? webCard : compactRows;

const regular = (state: SectionCase): SectionDrawing =>
  state.webGrouped ? webCard : plain;

function rows(state: SectionCase): SectionDrawing {
  if (state.phone) return phoneGrouped;

  return state.compact ? compactable(state) : regular(state);
}

function popover(state: SectionCase): SectionDrawing {
  if (!state.menu) return rows(state);

  return state.choosing ? choosingMenu : menu;
}

const flush = (drawing: SectionDrawing): SectionDrawing => ({
  ...drawing,
  inset: 'px-0',
});

export function sectionDrawing(state: SectionCase): SectionDrawing {
  const drawing = state.sidebar ? sidebar : popover(state);

  return state.padded ? flush(drawing) : drawing;
}
