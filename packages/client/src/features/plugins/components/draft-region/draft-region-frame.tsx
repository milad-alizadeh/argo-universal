import type * as React from 'react';
import { Pressable, View } from 'react-native';
import type { DraftRegionTag as Tag } from '../../utils/draft-regions-model';
import { DraftRegionTag } from './draft-region-tag';

export interface DraftRegionFrameProps {
  tag: Tag;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onPrevious: () => void;
  onNext: () => void;
  // The region's own drawing, which the frame never alters.
  children: React.ReactNode;
}

/*
 * A region of a Draft page as the App marks it: its tag straddles the top edge, and while the pointer is over the
 * region a hairline outline marks its bounds. App chrome beside the Plugin's drawing, never part of its tree.
 */
export function DraftRegionFrame(
  props: DraftRegionFrameProps,
): React.JSX.Element {
  const { active, children } = props;

  return (
    <Pressable
      accessible={false}
      focusable={false}
      onHoverIn={props.onActivate}
      onHoverOut={props.onDeactivate}
      className="relative"
    >
      {children}
      {active && (
        <View
          pointerEvents="none"
          className="absolute inset-0 rounded-xl border border-border"
        />
      )}
      <View className="absolute -top-2.5 left-3">
        <DraftRegionTag {...props} />
      </View>
    </Pressable>
  );
}
