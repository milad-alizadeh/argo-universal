import {
  useDeclaredActions,
  type ActionGroup,
} from '#primitives/actions/action';
import type { ScreenProps } from './screen-props';

export interface ScreenHeader {
  // The Screen's own Actions in Sections, danger Actions last, each showing its shortcut only while it is owned.
  groups: ActionGroup[];
  label: string;
  // The primary Action, which an Argo-drawn header ends with.
  primary: ActionGroup[];
  // The nodes the Actions' shortcuts run under, drawn by the Screen.
  anchors: string[];
}

const overflowLabel = 'More actions';

// A Screen's header is its props: `actions` and `primaryAction` are read here once, for every platform's header to draw.
export function useScreenHeader(
  props: Pick<ScreenProps, 'actions' | 'primaryAction'>,
): ScreenHeader {
  const own = useDeclaredActions(props.actions);
  const primary = useDeclaredActions(props.primaryAction);

  return {
    groups: own.groups,
    label: overflowLabel,
    primary: primary.groups,
    anchors: [own.id, primary.id],
  };
}
