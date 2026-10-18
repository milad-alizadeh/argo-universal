import { useOverlayList } from '#primitives/fields/field-layout';
import type { IconRole } from '../../../symbols/icon-role';
import { type RowLanePlace, useRowLanePlace } from './grouped-list-item-lane';

/*
 * The role of a row's leading icon, image slot or spinner, on every platform: a popover's compact
 * row leads with a Body-sized slot, as Paper's menu rows do; a sidebar row keeps the row icon's;
 * a grouped row draws a stock Form's and Material list item's 24 at every width.
 */
const leadingRoles = {
  compact: 'row',
  sidebar: 'row',
  grouped: 'grouped-row',
} as const satisfies Record<RowLanePlace, IconRole>;

export function useLeadingRole(): IconRole {
  const place = useRowLanePlace();

  return useOverlayList() ? 'body' : leadingRoles[place];
}
