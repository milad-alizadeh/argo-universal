import { createElement, type ReactElement } from 'react';
import { Platform } from 'react-native';
import { FieldLink } from '#primitives/fields/field-link';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import { useWide } from '../../../use-wide/use-wide';
import { DrillPopover } from './drill-popover';
import type { DrillProps } from './drill-props';
import { DrillSheet } from './drill-sheet';

// True where a drill opens its choices in a popover beside the row: a desktop window.
export function useDrillBeside(): boolean {
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

const noPress = (): void => {};

// Paper: the row is a FieldGroup link, so a Drill sits in a FieldGroup section; its press is the Drill's own.
function useDrillTrigger(
  props: DrillProps,
): NonNullable<DrillProps['trigger']> {
  const value = useSizeClassValue(props.value);

  return (
    props.trigger ??
    createElement(FieldLink, {
      title: props.label,
      value,
      leading: props.leading,
      disabled: props.disabled,
      onPress: noPress,
    })
  );
}
