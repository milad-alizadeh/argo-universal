import type { ReactElement } from 'react';
import { Sheet } from '#primitives/overlays/sheet';
import { InspectorPane } from './inspector-pane';
import type { InspectorProps } from './inspector-props';

// Under wide the web raises the Inspector as Sheet's drawer or centred modal; its header keeps the close button.
export function InspectorSheet(props: InspectorProps): ReactElement {
  return (
    <Sheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      label={props.title}
      detents={['medium', 'large']}
    >
      <Sheet.Page name="inspector">
        <InspectorPane {...props} inSheet />
      </Sheet.Page>
    </Sheet>
  );
}
