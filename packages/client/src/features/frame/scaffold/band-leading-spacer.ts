interface BandLeadingMeasures {
  leadingWidth: number;
  inset: number;
  navPaneWidth: number;
}

// The title clears the leading controls continuously as the panes beside it resize.
export function bandLeadingSpacer({
  leadingWidth,
  inset,
  navPaneWidth,
}: BandLeadingMeasures): number {
  return Math.max(0, leadingWidth - (inset + navPaneWidth));
}
