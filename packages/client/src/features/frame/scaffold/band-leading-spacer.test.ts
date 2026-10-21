import { describe, expect, it } from 'vitest';
import { bandLeadingSpacer } from './band-leading-spacer';

describe('bandLeadingSpacer', () => {
  it.each([
    { leadingWidth: 124, inset: 8, navPaneWidth: 0, spacer: 116 },
    { leadingWidth: 124, inset: 8, navPaneWidth: 56, spacer: 60 },
    { leadingWidth: 124, inset: 8, navPaneWidth: 115, spacer: 1 },
    { leadingWidth: 124, inset: 8, navPaneWidth: 116, spacer: 0 },
    { leadingWidth: 124, inset: 8, navPaneWidth: 117, spacer: 0 },
    { leadingWidth: 124, inset: 8, navPaneWidth: 368, spacer: 0 },
    { leadingWidth: 44, inset: 8, navPaneWidth: 0, spacer: 36 },
    { leadingWidth: 44, inset: 8, navPaneWidth: 35, spacer: 1 },
    { leadingWidth: 44, inset: 8, navPaneWidth: 36, spacer: 0 },
    { leadingWidth: 44, inset: 8, navPaneWidth: 56, spacer: 0 },
  ])('clears $leadingWidth at nav width $navPaneWidth', ({ spacer, ...input }) => {
    expect(bandLeadingSpacer(input)).toBe(spacer);
  });
});
