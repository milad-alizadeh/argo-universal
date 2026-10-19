import type { Subagent } from '@repo/contracts';

export interface SubagentListProps {
  subagents: Subagent[];
  onSelect?: (subagent: Subagent) => void;
  now?: number;
}

export type SubagentSection = {
  title: 'Running' | 'Finished';
  rows: Subagent[];
};

export function subagentSections(subagents: Subagent[]): SubagentSection[] {
  const running = subagents.filter((subagent) => subagent.state !== 'idle');
  const finished = subagents.filter((subagent) => subagent.state === 'idle');

  return [
    ...(running.length ? [{ title: 'Running' as const, rows: running }] : []),
    ...(finished.length
      ? [{ title: 'Finished' as const, rows: finished }]
      : []),
  ];
}
