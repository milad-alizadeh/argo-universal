import { type JSX, useState } from 'react';
import type { SessionInspectorContent } from './session-inspector-content';
import { SessionWorkbenchSheet } from './session-workbench-sheet';

// A phone's Workbench sheet, already open over the Session.
export function WorkbenchSheetPreview({
  content,
}: {
  content: SessionInspectorContent;
}): JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <SessionWorkbenchSheet
      content={content}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
