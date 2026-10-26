import {
  InspectorPane,
  type InspectorPaneProps,
} from '@repo/kit/primitives/scaffolds/inspector';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import {
  ChangesFiles,
  ChangesToolbar,
  ChangesSheetHeader,
  type ChangesViewProps,
} from '#features/changes';

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

/*
 * The Changes Inspector: the comparison and totals stay under the header while the files scroll in their own list. On
 * a phone it is the sheet's page: the sheet draws the title and the close, so the pane draws neither, nor an expand.
 */
export function ChangesInspector(
  props: ChangesInspectorProps,
): React.JSX.Element {
  const pane = <ChangesPane {...props} />;

  return (
    <SizeClass
      compact={<ChangesPane {...props} inSheet />}
      medium={pane}
      wide={pane}
    />
  );
}

function ChangesPane(props: ChangesInspectorProps): React.JSX.Element {
  return (
    <InspectorPane
      {...paneOf(props)}
      contentScrolls
      toolbar={<ChangesToolbar {...props} />}
    >
      <ChangesFiles {...props} />
    </InspectorPane>
  );
}
