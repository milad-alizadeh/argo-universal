import type * as React from 'react';
import { DisclosureChevron } from '#primitives/status/disclosure-chevron';
import { Icon } from '#primitives/content/icon';
import type { RowLanePlace } from './grouped-list-item-lane';

/*
 * The chevron that says a row opens another page. A grouped row draws iOS 26's: 7x12, in the
 * tertiary grey (neutral-300, the border token), its ink M + 3 from the card's edge, 14 after the
 * value. The 20 box leaves 6.67 of air each side of the ink, so it reaches 4 past the row's margin.
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
      className="-mr-1 shrink-0 text-border"
    />
  );
}
