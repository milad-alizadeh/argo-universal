import type { z } from 'zod';
import type { Json } from '../plugins/hook-protocol';
import type { OperationId, operations } from './index';

type OperationAnswer = z.output<(typeof operations)[OperationId]['result']>;

export interface AgentImageResult {
  summary: Json;
  image: { data: string; mimeType: string };
}

// Image Operations describe what the waiting Agent sees and what the Feed keeps.
export interface ImageVisibility {
  forAgent(result: Json): AgentImageResult | null;
  forToolCall(result: OperationAnswer): Json | null;
}
