import type { SelectionMode } from '#kit/selection-mode';
import {
  useDeclaredActions,
  type HeaderDeclaration,
} from '#primitives/actions/action';
import type { ScreenProps } from './screen-props';

type Declared = Pick<ScreenProps, 'actions' | 'primaryAction' | 'search'>;

const nothingDeclared: Declared = {};

/*
 * A Screen's header read once from its props, for every room to finish. While a List selects, its header replaces the
 * Screen's, so the Screen's own Actions are not declared and their shortcuts stop.
 */
export function useHeaderDeclaration(
  props: Declared,
  selection: SelectionMode | null,
): HeaderDeclaration {
  const shown = selection?.header ? nothingDeclared : props;
  const own = useDeclaredActions(shown.actions);
  const primary = useDeclaredActions(shown.primaryAction);

  return {
    groups: own.groups,
    primary: primary.actions,
    search: Boolean(props.search),
    selection,
    anchors: [own.id, primary.id],
  };
}
