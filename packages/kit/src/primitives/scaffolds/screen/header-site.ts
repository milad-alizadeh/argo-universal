/*
 * Where a Screen's header draws, decided once from the facts around it (ADR-0043). Each site has one adapter that only
 * draws: the Screen's own heading, the navigator's stack header, a list column's top row, or the window's band.
 */
export type HeaderSite = 'heading' | 'stack' | 'list column' | 'band' | 'none';

// A header-only Screen has no body to draw a heading above, so its wide header goes to the band.
export type HeaderKind = 'screen' | 'header only';

export interface HeaderFacts {
  kind: HeaderKind;
  // The Screen is the content of a list column, which draws its heading in its top row.
  listColumn: boolean;
  // A navigator draws this Screen's narrow header; a preview has none.
  navigator: boolean;
  wide: boolean;
  // Web draws a Screen's heading below wide with no navigator; a native preview draws nothing there.
  web: boolean;
}

export interface HeaderPlan {
  site: HeaderSite;
  /*
   * A navigator holds an entry for the Screen and needs its options set, even while another site draws the header and
   * the stack's own is hidden.
   */
  stackEntry: boolean;
}

export function headerPlan(facts: HeaderFacts): HeaderPlan {
  const site = siteOf(facts);

  return { site, stackEntry: facts.navigator && site !== 'list column' };
}

function siteOf(facts: HeaderFacts): HeaderSite {
  return facts.kind === 'header only'
    ? headerOnlySite(facts)
    : screenSite(facts);
}

function screenSite(facts: HeaderFacts): HeaderSite {
  if (facts.listColumn) return 'list column';

  if (facts.wide) return 'heading';

  return narrowScreenSite(facts);
}

function narrowScreenSite(facts: HeaderFacts): HeaderSite {
  if (facts.navigator) return 'stack';

  return facts.web ? 'heading' : 'none';
}

function headerOnlySite(facts: HeaderFacts): HeaderSite {
  if (facts.wide) return 'band';

  return facts.navigator ? 'stack' : 'none';
}
