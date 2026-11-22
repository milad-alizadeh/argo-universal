import type * as React from 'react';
import { View } from 'react-native';
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

  // A nested Pressable can take hover from its parent on web, hiding the chevron under the pointer.
  return (
    <View
      onPointerEnter={(event) => {
        if (tagged && event.nativeEvent.pointerType !== 'touch')
          props.onActivate();
      }}
      onPointerLeave={(event) => {
        if (event.nativeEvent.pointerType !== 'touch') props.onDeactivate();
      }}
      className="relative pt-6"
    >
      {children}
      {active && (
        <View
          pointerEvents="none"
          className="absolute inset-x-0 bottom-0 top-2.5 rounded-xl border border-border"
        />
      )}
      {tagged && (
        <View className="absolute top-0 left-3">
          <DraftRegionTag {...props} />
        </View>
      )}
    </View>
  );
}
