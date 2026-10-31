import type { AgentServer } from '@repo/contracts';
import {
  type ChosenSettings,
  chooseAnotherProject,
  openProblem,
} from '#features/sessions';
import { agentsHref } from '#lib/product/navigation/navigation';
import type {
  SessionNewViewProps,
  ReadySessionNewViewProps,
} from '../session-new-view';
import { draftProps, openingProps } from './new-session-composer-props';
import {
  hasFailedToLoad,
  type LoadedNewSession,
  loadedNewSession,
} from './new-session-load';
import type { NewSessionWiring, ReadyProps } from './new-session-wiring';
import type { NewSessionData } from './use-new-session-data';

type ConfigurationProps = ReadySessionNewViewProps['configuration'];

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
  agents: AgentServer[],
  wiring: NewSessionWiring,
): ReadyProps<'agents' | 'onAgentChange' | 'onAddAgents'> => ({
  agents,
  onAgentChange: (agent) =>
    rechoose(wiring, (current) => ({ ...current, agent })),
  // Settings has no stack until it is first opened, and a page opened first would have no list under it; Back returns here, not to that list.
  onAddAgents: () => wiring.navigate(agentsHref(), { withAnchor: true }),
});

// The chosen Agent is the one New Session's choices already found among the Installed Agents.
const configurationProps = (wiring: NewSessionWiring): ConfigurationProps => ({
  agent: wiring.data.choices.agent,
  configOptions: [],
  onConfigChange: ignoreConfigChange,
  ...wiring.configuration,
  checkout: checkoutProps(wiring.data),
});

type NoticeProps = ReadyProps<
  | 'attachmentError'
  | 'attachmentErrorKey'
  | 'callout'
  | 'signInTerminal'
  | 'calloutInConfiguration'
>;

const noticeProps = ({
  attachmentDraft,
  callout,
  sessionOpening,
}: NewSessionWiring): NoticeProps => ({
  attachmentError: attachmentDraft.attachmentError?.message,
  attachmentErrorKey: attachmentDraft.attachmentError?.key,
  ...callout,
  calloutInConfiguration: !openProblem(sessionOpening.session),
});

const readyProps = (
  { serverName, projects, agents }: LoadedNewSession,
  wiring: NewSessionWiring,
): ReadySessionNewViewProps => ({
  serverName,
  connected: wiring.connected,
  projects,
  ...projectProps(wiring),
  ...agentChoiceProps(agents, wiring),
  configuration: configurationProps(wiring),
  slashCommands: wiring.discovery?.commands ?? undefined,
  ...draftProps(wiring),
  ...openingProps(wiring),
  ...noticeProps(wiring),
});

// What New Session shows: its load state, or the ready page over the reader's choices and draft.
export function toSessionNewViewProps(
  wiring: NewSessionWiring,
): SessionNewViewProps {
  if (hasFailedToLoad(wiring.data)) return { state: 'load-failed' };
  const loaded = loadedNewSession(wiring.data);

  if (!loaded) return { state: 'loading' };

  return { state: 'ready', ...readyProps(loaded, wiring) };
}
