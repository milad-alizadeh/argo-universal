import type * as React from 'react';
import { Pressable } from 'react-native';
import { Icon } from '../lib/icon';
import { infoPopoverTriggerClass } from './info-popover-props';

export function InfoPopoverTrigger(props: {
  accessibilityLabel: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      className={infoPopoverTriggerClass}
    >
      <Icon name="info" className="text-muted-foreground" />
    </Pressable>
  );
}
