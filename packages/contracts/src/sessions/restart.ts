import { z } from 'zod';
import { sessionColumns } from '../columns';
import type { SlashCommand } from './agent-options';

const RestartedSession = z.strictObject({
  sessionId: sessionColumns.shape.id,
});

// Input of `session.reload`: the Session whose Agent session is closed and opened again.
export const SessionReloadInput = RestartedSession;

export type SessionReloadInput = z.infer<typeof SessionReloadInput>;

export const SessionReloadOutput = z.strictObject({});

export type SessionReloadOutput = z.infer<typeof SessionReloadOutput>;

// Input of `session.clear`: the Session that gets a new Agent session.
export const SessionClearInput = RestartedSession;

export type SessionClearInput = z.infer<typeof SessionClearInput>;

export const SessionClearOutput = z.strictObject({});

export type SessionClearOutput = z.infer<typeof SessionClearOutput>;

// How a Session's Agent session restarts: `reload` opens the same one again, `clear` opens a new one.
export const SessionRestart = z.enum(['reload', 'clear']);

export type SessionRestart = z.infer<typeof SessionRestart>;

/*
 * Argo's own Slash commands, which act on the Session and never reach the Agent. ACP has no request
 * for either, and the Agents' adapters leave them to the client. Each is named after the restart it runs.
 */
export const argoSlashCommands = [
  {
    name: 'clear',
    description: 'Start a new Agent session; the Feed and Checkout stay',
  },
  {
    name: 'reload',
    description:
      'Start the Agent again to pick up new skills, extensions and settings',
  },
] as const satisfies readonly (SlashCommand & { name: SessionRestart })[];

type AgentCommands = readonly SlashCommand[] | null | undefined;

// The Agent reports a Slash command of this name, so its own runs and Argo's is left out.
export const agentReportsCommand = (
  commands: AgentCommands,
  name: string,
): boolean => commands?.some((command) => command.name === name) ?? false;

// What an open Session's Composer offers: the Agent's Slash commands, then Argo's the Agent does not also report.
export const withArgoSlashCommands = (
  commands: AgentCommands,
): SlashCommand[] => [
  ...(commands ?? []),
  ...argoSlashCommands.filter(
    ({ name }) => !agentReportsCommand(commands, name),
  ),
];
