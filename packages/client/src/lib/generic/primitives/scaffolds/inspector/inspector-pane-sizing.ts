import type { InspectorPaneProps } from './inspector-pane';

export const isFittedSheet = (props: InspectorPaneProps): boolean =>
  props.inSheet === true && props.sheetHeader !== undefined;

export function paneSizing(props: InspectorPaneProps): string {
  if (!props.inSheet) return 'flex-1';

  return isFittedSheet(props) ? 'min-h-0 shrink' : 'h-140';
}
