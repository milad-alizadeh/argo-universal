import type * as React from 'react';
import { DisclosureChevron } from '#primitives/status/disclosure-chevron';

// The chevron that says a row opens another page.
export function Disclosure({
  visible,
}: {
  visible: boolean;
}): React.JSX.Element | null {
  return visible ? (
    <DisclosureChevron role="chevron" className="shrink-0" />
  ) : null;
}
