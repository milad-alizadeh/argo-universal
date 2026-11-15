import type {
  SessionNotification,
  ContentBlock,
} from '@agentclientprotocol/sdk';
import { FollowUpSuggestion } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';
import { jsonCodec } from '../../../lib/json-codec';
import { jsonObjects } from './prediction-json';

const SuggestionText = FollowUpSuggestion.shape.text.unwrap().trim().min(1);

// A prediction object whose suggestion is blank or too long to show is still a prediction: it offers none.
const Prediction = z.object({
  suggestion: z
    .string()
    .nullable()
    .transform((text) => SuggestionText.safeParse(text).data ?? null),
});

// Enough of a rejected reply to see what the Agent said instead.
const replyExcerptLength = 200;

const replyExcerpt = (text: string): string =>
  `(${text.length} characters) ${JSON.stringify(text.slice(0, replyExcerptLength))}`;

// Room for an Agent's startup banner before the prediction; pi lists every installed skill and extension.
const maximumOutputLength = 32_768;

const rejections = createRejectionCounter('Follow-up suggestion');

const PredictionJson = jsonCodec(Prediction);

// The last object in the reply that reads as a prediction.
function predictionText(text: string): string | null {
  for (const candidate of jsonObjects(text)) {
    const parsed = PredictionJson.safeParse(candidate);

    if (parsed.success) return parsed.data.suggestion;
  }

  rejections.report(
    `Rejected malformed prediction ${replyExcerpt(text)}`,
    new Error('No prediction object in the reply'),
  );

  return null;
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
