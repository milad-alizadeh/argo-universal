import type * as React from 'react';
import {
  ChangesFiles,
  ChangesToolbar,
  type ChangesViewProps,
} from '#features/changes';
import {
  InspectorPane,
  type InspectorPaneProps,
} from '#primitives/scaffolds/inspector';

export type ChangesInspectorProps = ChangesViewProps &
  Pick<
    InspectorPaneProps,
    'expanded' | 'onExpandedChange' | 'onOpenChange' | 'inSheet'
  >;

const paneOf = ({
  expanded,
  onExpandedChange,
  onOpenChange,
  inSheet,
}: ChangesInspectorProps): Omit<InspectorPaneProps, 'children'> => ({
  title: 'Changes',
  open: true,
  expanded,
  onExpandedChange,
  onOpenChange,
  inSheet,
});

// The Changes Inspector: the comparison and totals stay under the header while the files scroll.
export function ChangesInspector(
  props: ChangesInspectorProps,
): React.JSX.Element {
  return (
    <InspectorPane {...paneOf(props)} toolbar={<ChangesToolbar {...props} />}>
      <ChangesFiles {...props} />
    </InspectorPane>
  );
}
