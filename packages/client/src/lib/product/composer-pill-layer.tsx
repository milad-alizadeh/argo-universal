import type * as React from 'react';
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import {
  ComposerPillLift,
  overlayGap,
  overlayLayer,
  useFeedEndClearance,
} from './composer-cover';
import { SessionColumn } from './session-column';

// The pill's height: the floating controls are 32 tall.
const composerPillHeight = 32;

const layerStyle = (pillBottom: number): ViewStyle => ({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: pillBottom,
  zIndex: overlayLayer,
});

function PillLayer({ pill }: { pill: ReactNode }): React.JSX.Element {
  const { pillBottom } = useFeedEndClearance();

  return (
    <View pointerEvents="box-none" style={layerStyle(pillBottom)}>
      <SessionColumn pointerEvents="box-none" className="items-center">
        {pill}
      </SessionColumn>
    </View>
  );
}

/*
 * A pill centred in the Session's column, directly above the Composer. It lifts Jump to latest above it, in the Feed
 * inside this layer, so the two never overlap.
 */
export function ComposerPillLayer(props: {
  // Null draws no pill and lifts nothing.
  pill: ReactNode;
  children: ReactNode;
}): React.JSX.Element {
  const lift = props.pill ? composerPillHeight + overlayGap : 0;

  return (
    <ComposerPillLift.Provider value={lift}>
      {props.children}
      {props.pill && <PillLayer pill={props.pill} />}
    </ComposerPillLift.Provider>
  );
}
