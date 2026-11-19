import { SizeClass } from '@repo/kit/size-class/size-class';
import type { ReactNode } from 'react';
import {
  ShellSheet,
  type ShellPanelProps,
  SubagentSheet,
  type SubagentFeedPage,
  type SubagentListProps,
} from '#features/sessions';

export interface WorkSheet {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type SubagentWork = SubagentListProps & { feed?: SubagentFeedPage };

export function subagentsSheet(
  props: SubagentWork | undefined,
  sheet: WorkSheet,
): ReactNode {
  if (!props?.subagents.length) return null;

  return (
    <SizeClass only="compact">
      <SubagentSheet {...props} {...sheet} />
    </SizeClass>
  );
}

export function shellsSheet(
  props: ShellPanelProps | undefined,
  sheet: WorkSheet,
): ReactNode {
  if (!props?.shells.length) return null;

  return (
    <SizeClass only="compact">
      <ShellSheet {...props} {...sheet} />
    </SizeClass>
  );
}

// What a Subagent row in the Feed asks for: the child's own Feed, named by its session.
export type OpenSubagent = (subagentSessionId: string) => void;

const selectNamed = (
  props: SubagentListProps,
  subagentSessionId: string,
): void => {
  const named = props.subagents.find(
    (one) => one.sessionId === subagentSessionId,
  );

  if (named) props.onSelect?.(named);
};

// A Feed row opens the same place its Subagents list row does: the panel, then the child it names.
export const selectSubagent =
  (props: SubagentListProps | undefined, sheet: WorkSheet): OpenSubagent =>
  (subagentSessionId) => {
    sheet.onOpenChange(true);

    if (props) selectNamed(props, subagentSessionId);
  };
