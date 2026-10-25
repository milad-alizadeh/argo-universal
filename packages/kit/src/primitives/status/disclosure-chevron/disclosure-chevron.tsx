import type * as React from 'react';
import { Chevron } from '#primitives/status/chevron';
import type { DisclosureChevronProps } from './disclosure-chevron-props';

// A row's disclosure chevron stands beside its md icon.
export function DisclosureChevron(
  props: DisclosureChevronProps,
): React.JSX.Element {
  return <Chevron {...props} direction="right" beside="md" />;
}
