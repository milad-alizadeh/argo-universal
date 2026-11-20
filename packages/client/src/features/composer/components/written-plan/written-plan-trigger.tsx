import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { Pill } from '@repo/kit/primitives/status/pill';
import { PhonePill } from '@repo/kit/primitives/status/pill';
import type * as React from 'react';
import { View } from 'react-native';

export interface WrittenPlanTriggerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  wide: boolean;
}

export function WrittenPlanTrigger(
  props: WrittenPlanTriggerProps,
): React.JSX.Element {
  if (props.wide)
    return (
      <View className="min-h-composer-tray-row justify-center">
        <Pill variant="control" appearance="glass" {...triggerProps(props)} />
      </View>
    );

  return <PhonePlanTrigger {...props} />;
}

function PhonePlanTrigger(props: WrittenPlanTriggerProps): React.JSX.Element {
  return (
    <PhonePill
      role="button"
      accessibilityLabel="Written plan"
      aria-expanded={props.open}
      onPress={() => props.setOpen(!props.open)}
    >
      <Icon name="file-text" />
      <Text role="control">Written plan</Text>
    </PhonePill>
  );
}

function triggerProps(
  props: WrittenPlanTriggerProps,
): React.ComponentProps<typeof Pill> {
  return {
    text: 'Written plan',
    icon: 'file-text',
    detail: props.wide ? props.title : undefined,
    fill: props.wide,
    accessibilityLabel: 'Written plan',
    'aria-expanded': props.open,
    onPress: () => props.setOpen(!props.open),
    disclosure: props.open ? 'up' : 'down',
  };
}
