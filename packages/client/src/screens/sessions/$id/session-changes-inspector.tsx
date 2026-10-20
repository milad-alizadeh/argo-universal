import type * as React from 'react';
import {
  ChangesFiles,
  ChangesToolbar,
  ChangesSheetHeader,
  type ChangesViewProps,
} from '#features/changes';
import type { SessionHeaderProps } from '#features/sessions';
import { Inspector } from '#primitives/scaffolds/inspector';

type SessionChangesInspectorProps = {
  changes: NonNullable<SessionHeaderProps['changes']>;
  view: ChangesViewProps | undefined;
};

export function SessionChangesInspector({
  changes,
  view,
}: SessionChangesInspectorProps): React.JSX.Element {
  return (
    <Inspector {...inspectorOf(changes, view)}>
      {view && <ChangesFiles {...view} />}
    </Inspector>
  );
}

const inspectorOf = (
  changes: SessionChangesInspectorProps['changes'],
  view: ChangesViewProps | undefined,
): Omit<React.ComponentProps<typeof Inspector>, 'children'> => ({
  title: 'Changes',
  open: changes.open,
  onOpenChange: changes.onOpenChange,
  sheetHeader: <ChangesSheetHeader />,
  toolbar: view && <ChangesToolbar {...view} />,
});
