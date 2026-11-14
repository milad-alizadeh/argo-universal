import { scrollFadeLayer } from '@repo/kit/scroll-fade/scroll-fade-options';
import type * as React from 'react';
import { createContext, type ReactNode, useContext } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useFeedEndClearance } from './composer-cover';
import { SessionColumn } from './session-column';

// How far a pill sits above the Composer's top, on every device; Jump to latest sits the same gap above the pill.
const composerPillGap = 12;

// The pill's height: the floating controls are 32 tall.
const composerPillHeight = 32;

// How far a pill lifts what floats above the Composer, such as Jump to latest: nothing while no pill is drawn.
const ComposerPillLift = createContext(0);

export const useComposerPillLift = (): number => useContext(ComposerPillLift);

// Above the Feed's edge fades, as Jump to latest is.
const pillLayer = scrollFadeLayer + 1;

const layerStyle = (composerTop: number): ViewStyle => ({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: composerTop + composerPillGap,
  zIndex: pillLayer,
});

function PillLayer({ pill }: { pill: ReactNode }): React.JSX.Element {
  const { composerTop } = useFeedEndClearance();

  return (
    <View pointerEvents="box-none" style={layerStyle(composerTop)}>
      <SessionColumn className="pointer-events-box-none items-center">
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
  const lift = props.pill ? composerPillHeight + composerPillGap : 0;

  return (
    <ComposerPillLift.Provider value={lift}>
      {props.children}
      {props.pill && <PillLayer pill={props.pill} />}
    </ComposerPillLift.Provider>
  );
}
