import { readAgentServers } from '../agents';
import { requireTaken, sendPrompt, type TakenPrompt } from './sent-prompt';
import {
  answerSessionPermissionBySpeech,
  type SpokenPermissionOutcome,
} from './session-answers';
import type { SessionOperationImplementations } from './session-operations';
import type { SessionHandlerSources } from './session-sources';
import type { TurnHappening } from './turn-happenings';

const conversationSender = { type: 'conversation' } as const;

/*
 * What a Conversation reaches its Session's work through (ADR-0064): its requests for work, a spoken "stop", a Spoken
 * answer, the Session's Turns and its Agent's name. A Spoken answer goes through the click's own procedure and is never an Operation.
 */
export class ConversationSessionWork {
  public constructor(
    private readonly sources: SessionHandlerSources,
    private readonly implementations: SessionOperationImplementations,
  ) {}

  // The Conversation's request for work: a Sent Prompt that steers a running Turn when it can.
  public async promptFromConversation(
    sessionId: string,
    text: string,
  ): Promise<TakenPrompt> {
    const input = { sessionId, prompt: [{ type: 'text' as const, text }] };

    const sent = await sendPrompt(this.sources, input, {
      sender: conversationSender,
    });

    return requireTaken(sent);
  }

  // A spoken "stop": cancels the running Turn as the Stop button does; resolves false when no Turn runs.
  public async stopFromConversation(sessionId: string): Promise<boolean> {
    if (!this.sources.open.isRunning(sessionId)) return false;
    await this.implementations['session.cancel']({ sessionId });

    return true;
  }

  // A spoken allow-once or reject, applied to the request only while it is the one waiting.
  public answerFromConversation(
    sessionId: string,
    requestId: string,
    kind: 'allow_once' | 'reject_once',
  ): SpokenPermissionOutcome {
    return answerSessionPermissionBySpeech(this.sources, {
      sessionId,
      requestId,
      kind,
    });
  }

  // An Agent's name as Settings lists it, else its id.
  public agentName(agentId: string): string {
    const servers = readAgentServers(this.sources.database);

    return servers.find(({ id }) => id === agentId)?.name ?? agentId;
  }

  // Hears what an open Session reports of its Turns until the returned function is called; a closed Session reports none.
  public watchTurns(
    sessionId: string,
    listener: (happening: TurnHappening) => void,
  ): () => void {
    return this.sources.open.watchTurns(sessionId, listener);
  }
}
