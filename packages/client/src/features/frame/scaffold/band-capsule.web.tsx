import type { ReactElement } from 'react';
import { type BandCapsuleProps, CapsulePlace } from './capsule-place';

export type { BandCapsuleProps } from './capsule-place';

/*
 * On the web the pill is the panel's own glass, which grows into the panel as it opens (GlassSurface and
 * InspectorGlass), so the title bar keeps only where the pill stands.
 */
export function BandCapsule(props: BandCapsuleProps): ReactElement {
  return <CapsulePlace {...props} />;
}
