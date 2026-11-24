import { LiquidGlass } from '@repo/kit/primitives/content/liquid-glass';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { type BandCapsuleProps, CapsulePlace } from './capsule-place';

export type { BandCapsuleProps } from './capsule-place';

/*
 * A closed panel's controls float on a pill of the panels' glass behind their buttons, which stay ghost, so only a
 * hover tints them. A tablet draws the pill on its own: the panel's system glass takes its place as the panel opens.
 */
export function BandCapsule(props: BandCapsuleProps): ReactElement {
  const { box } = props;

  return (
    <CapsulePlace {...props}>
      <LiquidGlass corners="pill">
        <View style={{ width: box.width, height: box.height }} />
      </LiquidGlass>
    </CapsulePlace>
  );
}
