import type {
  SessionNotification,
  ContentBlock,
} from '@agentclientprotocol/sdk';
import { FollowUpSuggestion } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';

const Prediction = z.object({
  suggestion: FollowUpSuggestion.shape.text.unwrap().trim().min(1).nullable(),
});

const maximumOutputLength = 4096;

const rejections = createRejectionCounter('Follow-up suggestion');

function predictionText(text: string): string | null {
  try {
    return Prediction.parse(JSON.parse(text)).suggestion;
  } catch (error) {
    rejections.report('Rejected malformed prediction', error);

    return null;
  }
}

export class PredictionOutput {
  private text = '';

  public constructor(private readonly controller: AbortController) {}

  public observe = ({ update }: SessionNotification): undefined => {
    if (update.sessionUpdate === 'tool_call') this.controller.abort();

    if (update.sessionUpdate !== 'agent_message_chunk') return;

    this.appendContent(update.content);
  };

  private appendContent(content: ContentBlock): void {
    if (content.type === 'text') this.append(content.text);
  }

  private append(text: string): void {
    this.text += text;

    if (this.text.length > maximumOutputLength) this.controller.abort();
  }

  public read(): string | null {
    return predictionText(this.text);
  }
}
