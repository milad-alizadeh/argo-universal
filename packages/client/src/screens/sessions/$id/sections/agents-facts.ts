import type { SessionInspectorContent } from '../session-inspector-content';
import type { SectionFacts, SessionItems } from './session-section';

// The Agents this Session started, not the Installed Agents the Agents page lists.
export const agentsFacts = {
  key: 'subagents',
  title: 'Agents',
  icon: 'agent',
  offered: ({ subagents }: SessionItems): boolean => Boolean(subagents?.length),
  count: ({ subagents }: SessionInspectorContent): number =>
    subagents?.subagents.length ?? 0,
} satisfies SectionFacts;
