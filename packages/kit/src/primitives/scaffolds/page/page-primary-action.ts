import {
  declaredActions,
  isIconAction,
  type IconAction,
} from '#primitives/actions/action-list';
import type { PageProps } from './page-props';

// The `primaryAction` Slot's press Action, as the FAB and the header buttons draw it, which needs an icon.
export function pagePrimaryAction(
  props: Pick<PageProps, 'primaryAction'>,
): IconAction | undefined {
  return declaredActions(props.primaryAction).find(isIconAction);
}
