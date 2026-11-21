import type * as React from 'react';
import { Pressable, View } from 'react-native';
import type { DraftRegionTag as Tag } from '../../utils/draft-regions-model';
import { DraftRegionTag } from './draft-region-tag';

export interface DraftRegionFrameProps {
  tag: Tag;
  active: boolean;
  tagged?: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onPrevious: () => void;
  onNext: () => void;
  children: React.ReactNode;
}

export function DraftRegionFrame(
  props: DraftRegionFrameProps,
): React.JSX.Element {
  const { children, tagged = true } = props;
  const active = props.active && tagged;

  return (
    <Pressable
      accessible={false}
      focusable={false}
      onHoverIn={tagged ? props.onActivate : undefined}
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
      {tagged && (
        <View className="absolute -top-2.5 left-3">
          <DraftRegionTag {...props} />
        </View>
      )}
    </Pressable>
  );
}
