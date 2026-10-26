import type { ReactElement } from 'react';
import { InspectorPane } from './inspector-pane';
import type { InspectorProps } from './inspector-props';
import { InspectorSheetFrame } from './inspector-sheet-frame';

/*
 * Under wide the web raises the Inspector as Sheet's drawer or centred modal; its header keeps the close button. A pane
 * that gives way to the caller's own header draws no title, so the sheet's page carries it.
 */
export function InspectorSheet(props: InspectorProps): ReactElement {
  return (
    <InspectorSheetFrame
      inspector={props}
      screenTitle={props.sheetHeader ? props.title : undefined}
    >
      <InspectorPane {...props} inSheet />
    </InspectorSheetFrame>
  );
}
