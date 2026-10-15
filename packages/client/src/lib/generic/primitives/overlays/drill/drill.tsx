import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { useWide } from '../../../use-wide/use-wide';
import { DrillPopover } from './drill-popover';
import type { DrillProps } from './drill-props';
import { DrillSheet } from './drill-sheet';

// Paper: desktop rows open beside their group; phones push within their owning Sheet.
export function Drill(props: DrillProps): ReactElement {
  const desktop = useWide() && Platform.OS === 'web';
  const trigger = drillTrigger(props);

  return desktop ? (
    <DrillPopover {...props} trigger={trigger} row={!props.trigger} />
  ) : (
    <DrillSheet {...props} trigger={trigger} />
  );
}

function drillTrigger(props: DrillProps): NonNullable<DrillProps['trigger']> {
  return (
    props.trigger ?? (
      <GroupedListItem
        label={props.label}
        value={props.value}
        valueLeading={props.valueLeading}
        disabled={props.disabled}
        disclosure
        accessibilityRole="button"
      />
    )
  );
}
