import type * as React from 'react';
import {
  ChangesFiles,
  ChangesToolbar,
  type ChangesViewProps,
} from '#features/changes';
import { InspectorPane, type InspectorPaneProps } from '../inspector-pane';

export type ChangesInspectorProps = ChangesViewProps &
  Pick<InspectorPaneProps, 'expanded' | 'onStateChange'>;

// The Changes Inspector: the comparison and totals stay under the header while the files scroll.
export function ChangesInspector(
  props: ChangesInspectorProps,
): React.JSX.Element {
  return (
    <InspectorPane
      title="Changes"
      expanded={props.expanded}
      onStateChange={props.onStateChange}
      toolbar={<ChangesToolbar {...props} />}
    >
      <ChangesFiles {...props} />
    </InspectorPane>
  );
}
