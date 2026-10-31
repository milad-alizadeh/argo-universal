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
 * A length is kept only for a Prompt that was admitted, and every Turn begins with a Prompt: so what a Session
 * holds is the length of the Turn it is serving, and the Turn's end needs no step of its own. The next Prompt
 * writes its own length over it, and the user's Prompt clears the count altogether.
 *
 * Nothing here outlives the Server: a restart ends every Turn, which ends every chain.
 */
export class PromptChains {
  private readonly lengths = new Map<string, number>();
  // The length a Prompt sent from this Session's Turn carries.
  public sentFrom(sessionId: string): number {
    return (this.lengths.get(sessionId) ?? 0) + 1;
  }
  public exceeded(length: number): boolean {
    return length > maxPromptChain;
  }
  // The length of the Prompt this Session is about to serve.
  public serving(sessionId: string, length: number): void {
    this.lengths.set(sessionId, length);
  }
  public cleared(sessionId: string): void {
    this.lengths.delete(sessionId);
  }
  // The user in the loop: the Session their Prompt reaches counts from zero, and no other Operation clears one.
  public clearedByUser({ id, params }: RanOperation): void {
    if (id !== 'session.prompt') return;

    this.cleared(SessionPromptInput.parse(params).sessionId);
  }
}
