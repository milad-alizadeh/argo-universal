import type { AgentInfo } from '@repo/contracts';
import type {
  NewSessionViewProps,
  ReadyNewSessionViewProps,
} from '../components/new-session-view/new-session-view';
import {
  type ChosenSettings,
  chooseAnotherProject,
} from '../state/session-choices';
import { draftProps, openingProps } from './new-session-composer-props';
import {
  hasFailedToLoad,
  type LoadedNewSession,
  loadedNewSession,
} from './new-session-load';
import type { NewSessionWiring, ReadyProps } from './new-session-wiring';
import type { NewSessionData } from './use-new-session-data';

type ConfigurationProps = ReadyNewSessionViewProps['configuration'];

const rechoose = (
  { data }: NewSessionWiring,
  update: (current: ChosenSettings) => ChosenSettings,
): void => data.setChosen(update);

const ignoreConfigChange = (): void => {};

const projectProps = (
  wiring: NewSessionWiring,
): ReadyProps<'projectId' | 'onProjectChange'> => ({
  projectId: wiring.data.choices.project?.id ?? '',
  onProjectChange: (id) =>
    rechoose(wiring, (current) => chooseAnotherProject(current, id)),
});

const checkoutProps = ({
  choices,
  setChosen,
}: NewSessionData): ConfigurationProps['checkout'] => ({
  branch: choices.baseBranch,
  newWorktree: choices.inNewWorktree,
  onNewWorktreeChange: (newWorktree) =>
    setChosen((current) => ({ ...current, newWorktree })),
});

const agentChoiceProps = (
  wiring: NewSessionWiring,
): Pick<ConfigurationProps, 'onAgentChange' | 'onAddAgent'> => ({
  onAgentChange: (agent) =>
    rechoose(wiring, (current) => ({ ...current, agent })),
  onAddAgent: () =>
    wiring.navigate({ to: 'settings-agents', filter: 'not-installed' }),
});

const configurationProps = (
  agents: AgentInfo[],
  wiring: NewSessionWiring,
): ConfigurationProps => ({
  agents,
  agent: wiring.data.choices.agent?.agent ?? '',
  configOptions: [],
  onConfigChange: ignoreConfigChange,
  opening: wiring.sessionOpening.session.opening,
  ...agentChoiceProps(wiring),
  checkout: checkoutProps(wiring.data),
});

// What the last Readiness check observed about the chosen Agent, when it cannot start a Session.
const setupStepOf = (agent: AgentInfo | undefined): string | undefined =>
  agent && agent.status !== 'ready' ? agent.reason : undefined;

const noticeProps = ({
  data,
  attachmentDraft,
  sessionOpening,
}: NewSessionWiring): ReadyProps<
  'attachmentError' | 'setupStep' | 'openError'
> => ({
  attachmentError: attachmentDraft.attachmentError?.message,
  setupStep: setupStepOf(data.choices.agent),
  openError: sessionOpening.session.context.error,
});

const readyProps = (
  { serverName, projects, agents, agentsLoading }: LoadedNewSession,
  wiring: NewSessionWiring,
): ReadyNewSessionViewProps => ({
  serverName,
  agentsLoading,
  connected: wiring.connected,
  projects,
  ...projectProps(wiring),
  configuration: configurationProps(agents, wiring),
  ...draftProps(wiring),
  ...openingProps(wiring),
  ...noticeProps(wiring),
});

// What New Session shows: its load state, or the ready page over the reader's choices and draft.
export function toNewSessionViewProps(
  wiring: NewSessionWiring,
): NewSessionViewProps {
  if (hasFailedToLoad(wiring.data)) return { state: 'load-failed' };
  const loaded = loadedNewSession(wiring.data);

  if (!loaded) return { state: 'loading' };

  return { state: 'ready', ...readyProps(loaded, wiring) };
}
