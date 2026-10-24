import { createElement, type ReactElement } from 'react';
import { Platform } from 'react-native';
import { ListItem, type ListItemProps } from '#primitives/lists/list-item';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import { useWide } from '../../../use-wide/use-wide';
import { DrillPopover } from './drill-popover';
import type { DrillProps } from './drill-props';
import { DrillSheet } from './drill-sheet';

// True where a drill opens its choices in a popover beside the row: a desktop window.
function useDrillBeside(): boolean {
  return useWide() && Platform.OS === 'web';
}

// Paper: desktop rows open beside their group; phones push within their owning Sheet.
export function Drill(props: DrillProps): ReactElement {
  const desktop = useDrillBeside();
  const trigger = useDrillTrigger(props);

  return desktop ? (
    <DrillPopover
      {...props}
      trigger={trigger}
      row={!props.trigger || !!props.beside}
    />
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

  return props.trigger ?? createElement(ListItem, { ...row, disclosure: true });
}
