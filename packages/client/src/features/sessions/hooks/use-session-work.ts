import type { SessionSnapshot } from '@repo/contracts';
import type { ShellPanelProps } from '../components/shell-list/shell-panel';
import { type SessionPanels, useSessionPanels } from '../stores/session-panels';
import { useSessionShells } from './use-session-shells';

interface SessionWork {
  inspectorPanels: SessionPanels;
  shells: ShellPanelProps;
}

type Work = Pick<SessionSnapshot, 'subagents' | 'shells'>;

const noWork: Work = { subagents: [], shells: [] };

const workOf = (snapshot: Work | null): Work => snapshot ?? noWork;

// `offered` names the Sections the Session's work offers, which keep their Inspector tabs.
export function useSessionWork(
  sessionId: string,
  snapshot: Work | null,
  offered: (work: Work) => readonly string[],
): SessionWork {
  const work = workOf(snapshot);
  const panels = useSessionPanels(offered(work));
  const shown = panels.state.shown === 'shells';

  return {
    inspectorPanels: panels,
    shells: useSessionShells(sessionId, work.shells, shown),
  };
}
