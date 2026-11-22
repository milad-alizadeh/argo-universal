import { type JSX, useState } from 'react';
import type { SessionBarProps } from '#features/sessions';
import type { SessionInspectorContent } from './session-inspector-content';
import { SessionWorkbenchSheet } from './session-workbench-sheet';

// A phone's Workbench sheet, already open over the Session.
export function WorkbenchSheetPreview({
  content,
  bar,
}: {
  content: SessionInspectorContent;
  bar?: SessionBarProps;
}): JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <SessionWorkbenchSheet
      content={content}
      bar={bar}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
