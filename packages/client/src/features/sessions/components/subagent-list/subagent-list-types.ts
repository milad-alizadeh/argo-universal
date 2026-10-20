import type { Subagent } from '@repo/contracts';

export interface SubagentListProps {
  subagents: Subagent[];
  onSelect?: (subagent: Subagent) => void;
  now?: number;
}
