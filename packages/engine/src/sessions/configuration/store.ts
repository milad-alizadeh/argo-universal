import type { SessionConfigOption, SlashCommand } from '@repo/contracts';
import type { WriterJob } from '../../storage';
import type { SessionContext } from '../session-context';
import { SessionRowUpdateJob } from '../session-storage/session-storage';
import { AgentOptionsJob } from './agent-options-job';

type Owner = Pick<SessionContext, 'agent' | 'projectId'>;

const ownerOf = ({ agent, projectId }: Owner): Owner => ({ agent, projectId });

// The Session's options become its Agent's options in this Project, as New Session offers them.
export const agentOptionsJob = (
  context: Owner,
  options: SessionConfigOption[],
): WriterJob =>
  new AgentOptionsJob(ownerOf(context), options, { authoritative: true });

export const slashCommandsJob = (
  context: Owner,
  commands: SlashCommand[],
): WriterJob =>
  new AgentOptionsJob(ownerOf(context), undefined, {
    authoritative: true,
    commands,
  });

// The Session row keeps its durable choices and the choices it holds for the next Turn.
export const sessionChoicesJob = (
  context: Pick<SessionContext, 'sessionId'>,
  set: Partial<Pick<SessionContext, 'configValues' | 'heldConfig'>>,
): WriterJob => new SessionRowUpdateJob({ id: context.sessionId, set });
