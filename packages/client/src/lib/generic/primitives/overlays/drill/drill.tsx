import { createElement, type ReactElement } from 'react';
import { Platform } from 'react-native';
import { ListItem, type ListItemProps } from '#primitives/lists/list-item';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import { useWide } from '../../../use-wide/use-wide';
import { DrillPopover } from './drill-popover';
import type { DrillProps } from './drill-props';
import { DrillSheet } from './drill-sheet';

// Paper: desktop rows open beside their group; phones push within their owning Sheet.
export function Drill(props: DrillProps): ReactElement {
  const desktop = useWide() && Platform.OS === 'web';
  const trigger = useDrillTrigger(props);

  return desktop ? (
    <DrillPopover {...props} trigger={trigger} row={!props.trigger} />
  ) : (
    <DrillSheet {...props} trigger={trigger} />
  );
}

function useDrillTrigger(
  props: DrillProps,
): NonNullable<DrillProps['trigger']> {
  const value = useSizeClassValue(props.value);

  const row: ListItemProps = {
    title: props.label,
    value,
    leading: props.valueLeading,
    disabled: props.disabled,
    accessibilityRole: 'button',
  };

  return props.trigger ?? createElement(ListItem.Link, row);
}
