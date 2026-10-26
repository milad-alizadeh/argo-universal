import type { SessionInspectorContent } from '../session-inspector-content';
import type { SectionFacts, SessionItems } from './session-section';

export const shellsFacts = {
  key: 'shells',
  title: 'Shells',
  icon: 'terminal',
  offered: ({ shells }: SessionItems): boolean => Boolean(shells?.length),
  count: ({ shells }: SessionInspectorContent): number =>
    shells?.shells.length ?? 0,
} satisfies SectionFacts;
