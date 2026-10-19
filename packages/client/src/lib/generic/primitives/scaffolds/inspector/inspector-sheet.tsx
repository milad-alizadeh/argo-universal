import type { ReactElement } from 'react';
import { InspectorPane } from './inspector-pane';
import type { InspectorProps } from './inspector-props';
import { InspectorSheetFrame } from './inspector-sheet-frame';

// Under wide the web raises the Inspector as Sheet's drawer or centred modal; its header keeps the close button.
export function InspectorSheet(props: InspectorProps): ReactElement {
  return (
    <InspectorSheetFrame inspector={props}>
      <InspectorPane {...props} inSheet />
    </InspectorSheetFrame>
  );
}
