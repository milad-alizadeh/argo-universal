import {
  Orb,
  OrbPlaceholder,
  type OrbProps,
} from '@repo/kit/primitives/status/orb';
import { type ReactElement, useContext } from 'react';
import { FeedRowVisible } from './feed-row-visibility';

// A buffered iOS row can wait on a Metal drawable for a full second after leaving the viewport.
export function FeedOrb(props: OrbProps): ReactElement {
  return useContext(FeedRowVisible) ? (
    <Orb {...props} />
  ) : (
    <OrbPlaceholder size={props.size} />
  );
}
