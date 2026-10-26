import type { SessionSnapshot } from '@repo/contracts';
import type { ShellPanelProps } from '../components/shell-list/shell-panel';
import {
  offeredWorkPanels,
  type SessionPanels,
  useSessionPanels,
} from '../stores/session-panels';
import { useSessionShells } from './use-session-shells';

interface SessionWork {
  inspectorPanels: SessionPanels;
  shells: ShellPanelProps;
}

type Work = Pick<SessionSnapshot, 'subagents' | 'shells'>;

const noWork: Work = { subagents: [], shells: [] };

const workOf = (snapshot: Work | null): Work => snapshot ?? noWork;

export function useSessionWork(
  sessionId: string,
  snapshot: Work | null,
): SessionWork {
  const work = workOf(snapshot);
  const panels = useSessionPanels(offeredWorkPanels(work));

  return {
    inspectorPanels: panels,
    shells: useSessionShells(
      sessionId,
      work.shells,
      panels.state.shown === 'shells',
    ),
  };
}
