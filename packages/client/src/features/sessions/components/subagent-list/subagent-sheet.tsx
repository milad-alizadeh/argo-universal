import type * as React from 'react';
import { Sheet } from '#primitives/overlays/sheet';
import { SubagentList, type SubagentListProps } from './subagent-list';

export interface SubagentSheetProps extends SubagentListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The Composer's Subagents pill opens the list in the kit's platform Sheet.
export function SubagentSheet(props: SubagentSheetProps): React.JSX.Element {
  const { open, onOpenChange, ...list } = props;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      label="Subagents"
      contentScrolls
    >
      <Sheet.Page name="subagents" title="Subagents">
        <SubagentList {...list} />
      </Sheet.Page>
    </Sheet>
  );
}
