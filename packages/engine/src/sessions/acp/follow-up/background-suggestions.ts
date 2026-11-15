import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { FollowUpSuggestion } from '@repo/contracts';
import type { SessionContext } from '../../session-context';
import type { EndTurnParameters } from '../../turn';
import type { LocalSubmission } from '../prompts/submission';
import {
  type BackgroundRequest,
  generatePrediction,
} from './background-request';
import { SuggestionConversation } from './conversation';

export type SuggestionEvent = {
  type: 'acp.suggestion';
  suggestion: FollowUpSuggestion;
};

const generationTimeoutMs = 30_000;

export class BackgroundSuggestions {
  private readonly conversation = new SuggestionConversation();
  private controller: AbortController | undefined;
  private turnId: string | undefined;

  public begin(submission: LocalSubmission): void {
    if (this.turnId === submission.turnId) return;

    this.cancel();
    this.turnId = submission.turnId;
    this.conversation.begin(submission);
  }

  public observe(notification: SessionNotification): void {
    this.conversation.observe(notification);
  }

  public cancel(): void {
    this.controller?.abort();
    this.controller = undefined;
  }

  public finish(
    context: SuggestionContext,
    ended: EndTurnParameters,
    publish: (event: SuggestionEvent) => void,
  ): void {
    if (!eligible(context, ended)) return;

    const candidate = context.followUpSuggestion;

    if (!candidate) return;

    this.start(context, candidate.turnId, publish);
  }

  private start(
    context: SuggestionContext,
    turnId: string,
    publish: (event: SuggestionEvent) => void,
  ): void {
    const controller = new AbortController();
    this.controller = controller;
    const timer = generationTimer(controller);

    const input = {
      context,
      controller,
      conversation: this.conversation.read(),
    };

    void this.run(input, turnId, publish).finally(() => clearTimeout(timer));
  }

  private run(
    input: BackgroundRequest,
    turnId: string,
    publish: (event: SuggestionEvent) => void,
  ): Promise<void> {
    const { controller } = input;

    return generatePrediction(input)
      .then((text) => {
        if (!controller.signal.aborted && this.turnId === turnId)
          publish({ type: 'acp.suggestion', suggestion: { turnId, text } });
      })
      .catch((error: Error) => reportFailure(input.controller.signal, error));
  }
}

type SuggestionContext = BackgroundRequest['context'] &
  Pick<SessionContext, 'followUpSuggestion' | 'storageFailedTurn'>;

function eligible(
  context: Pick<SessionContext, 'storageFailedTurn'>,
  ended: EndTurnParameters,
): boolean {
  return ended.stopReason === 'end_turn' && !context.storageFailedTurn;
}

function reportFailure(signal: AbortSignal, error: Error): void {
  if (!signal.aborted)
    console.error('Follow-up suggestion generation failed', error);
}

function generationTimer(
  controller: AbortController,
): ReturnType<typeof setTimeout> {
  return setTimeout(() => controller.abort(), generationTimeoutMs);
}
