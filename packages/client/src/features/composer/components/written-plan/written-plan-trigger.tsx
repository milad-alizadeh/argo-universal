import { Pill } from '@repo/kit/primitives/status/pill';
import type * as React from 'react';

export interface WrittenPlanTriggerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  wide: boolean;
}

export function WrittenPlanTrigger(
  props: WrittenPlanTriggerProps,
): React.JSX.Element {
  return <Pill variant="control" appearance="glass" {...triggerProps(props)} />;
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
