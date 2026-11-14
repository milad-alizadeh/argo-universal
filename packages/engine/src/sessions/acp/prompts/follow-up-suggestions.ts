import type {
  InitializeResponse,
  PromptRequest,
  SessionNotification,
} from '@agentclientprotocol/sdk';
import { FollowUpSuggestion } from '@repo/contracts';
import type { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';

type Initialization = Pick<InitializeResponse, 'agentCapabilities'>;

type SuggestionSubmission = { turnId: string; followUpSuggestions?: boolean };

type SuggestionRejections = ReturnType<typeof createRejectionCounter>;

const maximumPromptIdLength = 1024;

const Capability = z.object({
  agentCapabilities: z.object({
    _meta: z.object({ promptSuggestions: z.object({ version: z.literal(1) }) }),
  }),
});

const Prediction = z.object({
  version: z.literal(1),
  promptId: z.string().min(1).max(maximumPromptIdLength),
  suggestions: z
    .array(
      z.object({ text: FollowUpSuggestion.shape.text.unwrap().trim().min(1) }),
    )
    .max(1),
});

export const supportsFollowUpSuggestions = (
  initialization: Initialization | undefined,
): boolean => Capability.safeParse(initialization).success;

export function followUpPromptMeta(
  initialization: Initialization | undefined,
  submission: SuggestionSubmission,
): Pick<PromptRequest, '_meta'> {
  if (!supportsFollowUpSuggestions(initialization)) return {};

  return {
    _meta: {
      promptSuggestions: {
        promptId: submission.turnId,
        enabled: submission.followUpSuggestions === true,
      },
    },
  };
}

export function parseFollowUpSuggestion(
  current: FollowUpSuggestion | null,
  value: SessionNotification['update'],
  rejections?: SuggestionRejections,
): FollowUpSuggestion | null {
  const prediction = decodePrediction(value, rejections);

  return prediction ? correlatedSuggestion(current, prediction) : current;
}

function decodePrediction(
  value: SessionNotification['update'],
  rejections: SuggestionRejections | undefined,
): z.infer<typeof Prediction> | undefined {
  const payload = value._meta?.promptSuggestions;

  return decodePayload(payload, rejections);
}

function decodePayload(
  payload: NonNullable<SessionNotification['update']['_meta']>[string],
  rejections: SuggestionRejections | undefined,
): z.infer<typeof Prediction> | undefined {
  if (payload === undefined) return undefined;

  const result = Prediction.safeParse(payload);

  if (result.success) return result.data;

  reportPredictionRejection(rejections, result.error);

  return undefined;
}

function reportPredictionRejection(
  counter: SuggestionRejections | undefined,
  error: z.ZodError,
): void {
  counter?.report('Rejected malformed Follow-up suggestion', error);
}

function correlatedSuggestion(
  current: FollowUpSuggestion | null,
  prediction: z.infer<typeof Prediction>,
): FollowUpSuggestion | null {
  if (!current) return null;

  if (prediction.promptId !== current.turnId) return current;

  return { turnId: current.turnId, text: suggestionText(prediction) };
}

function suggestionText(prediction: z.infer<typeof Prediction>): string | null {
  return prediction.suggestions[0]?.text ?? null;
}
