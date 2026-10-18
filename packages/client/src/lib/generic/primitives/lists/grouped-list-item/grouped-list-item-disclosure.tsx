import type * as React from 'react';
import { Icon } from '#primitives/content/icon';
import { DisclosureChevron } from '#primitives/status/disclosure-chevron';
import type { RowLanePlace } from './grouped-list-item-lane';

/*
 * The chevron that says a row opens another page. A grouped row draws iOS 26's shape, 7x12, from
 * Tabler's chevron-right (ADR-0019), in the tertiary token (neutral-400, owner 2026-10-18), its ink
 * M + 3 from the card's edge, 14 after the value. The 20 box leaves 6.67 of air each side of the
 * ink, so it reaches 4 past the row's margin.
 */
export function Disclosure({
  visible,
  place,
}: {
  visible: boolean;
  place: RowLanePlace;
}): React.JSX.Element | null {
  const Chevron = chevrons[place];

  return visible && Chevron ? <Chevron /> : null;
}

const RowChevron = (): React.JSX.Element => (
  <DisclosureChevron role="chevron" className="shrink-0" />
);

// A wide sidebar's rows select their page in place, with no chevron.
const chevrons: Record<RowLanePlace, (() => React.JSX.Element) | undefined> = {
  grouped: GroupedDisclosure,
  compact: RowChevron,
  sidebar: undefined,
};

function GroupedDisclosure(): React.JSX.Element {
  return (
    <Icon
      name="web-disclosure"
      role="disclosure"
      className="-mr-1 shrink-0 text-tertiary"
    />
  );
}
