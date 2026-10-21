import type * as React from 'react';
import {
  ChangesFiles,
  useChangesStage,
  ChangesToolbar,
  ChangesSheetHeader,
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
  sheetHeader: <ChangesSheetHeader />,
});

// The Changes Inspector: the comparison and totals stay under the header while the files scroll.
export function ChangesInspector(
  props: ChangesInspectorProps,
): React.JSX.Element {
  const stage = useChangesStage(props);
  const changes = stage.changes ?? props;

  return (
    <InspectorPane
      {...paneOf(props)}
      scrollState={stage.scrollState}
      toolbar={<ChangesToolbar {...changes} />}
    >
      <ChangesFiles {...changes} />
    </InspectorPane>
  );
}
