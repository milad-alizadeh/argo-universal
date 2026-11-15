import {
  agentReportsCommand,
  type SessionPromptInput,
  type SessionRestart,
  type SlashCommand,
} from '@repo/contracts';
import { savedAgentOptions } from '../configuration';
import type { HandlerSources } from '../session-sources';
import { namedRestart } from './argo-slash-commands';

type RestartSources = HandlerSources<
  'database' | 'findWriter',
  'context' | 'queued'
>;

// The Slash commands the Session's reader is shown: its live Agent's, or until it reports, those saved for its Agent and Project.
function agentCommands(
  sources: RestartSources,
  sessionId: string,
): SlashCommand[] | null {
  const live = sources.open.context(sessionId)?.slashCommands;

  if (live) return live;
  const { agent, projectId } = sources.open.queued(sessionId);

  return savedAgentOptions(sources, { agent, projectId }).commands;
}

// The restart a submitted Prompt runs instead of reaching the Agent; the Agent's commands are read only for a Prompt that names one.
export function submittedRestart(
  sources: RestartSources,
  { sessionId, prompt }: SessionPromptInput,
): SessionRestart | undefined {
  const restart = namedRestart(prompt);

  if (!restart) return undefined;

  // An Agent that reports the name runs its own command, as the Composer's menu offered it.
  return agentReportsCommand(agentCommands(sources, sessionId), restart)
    ? undefined
    : restart;
}
