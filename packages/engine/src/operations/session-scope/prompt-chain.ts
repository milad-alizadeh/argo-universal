import { SessionPromptInput } from '@repo/contracts';
import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { OperationParams } from '../implementations';

/*
 * What an Operation a caller ran carries before a schema reads it: the App's own parsed params, or the Json a
 * user token sent.
 */
export type RanOperation = {
  id: OperationId;
  params: OperationParams<OperationId> | Json;
};

// Argo asks once a cascade of Prompts has run this long with no user in it (ADR-0044).
const maxPromptChain = 10;

/*
 * How many Prompts stand behind the one a Session is serving: the user's Prompt is 0, and a Prompt an Agent
 * sends from its Turn is one more than the Prompt that started that Turn. Sessions in one Project prompt each
 * other at the `act` tier, so this is what stops two of them prompting each other forever with no user in the
 * loop; a Session answering the user sits at 1 and never meets the cap.
 *
 * A Session's length is the one it last received, so the next Prompt the user sends it starts the count again.
 * Nothing here outlives the Server: a restart ends every Turn, which ends every chain.
 */
export class PromptChains {
  private readonly lengths = new Map<string, number>();
  // What a Prompt this Session sends from its Turn carries.
  public next(sessionId: string): number {
    return (this.lengths.get(sessionId) ?? 0) + 1;
  }
  public exceeded(length: number): boolean {
    return length > maxPromptChain;
  }
  public received(sessionId: string, length: number): void {
    this.lengths.set(sessionId, length);
  }
  // A Prompt the user sent starts a new chain, whatever the Session was serving before.
  public cleared(sessionId: string): void {
    this.lengths.delete(sessionId);
  }
  // The user in the loop: the Session their Prompt reaches starts again, and no other Operation touches a chain.
  public clearedByUser({ id, params }: RanOperation): void {
    if (id !== 'session.prompt') return;

    this.cleared(SessionPromptInput.parse(params).sessionId);
  }
}
