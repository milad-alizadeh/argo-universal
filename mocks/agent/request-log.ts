import { z } from 'zod';

// A JSON-RPC message id as the Agent's stdio carries it.
export const MessageId = z.union([z.string(), z.number(), z.null()]);

// App E2E reads the ACP messages a scripted Agent process received and answered from its request log.
export type LoggedMessage =
  | {
      method: string;
      id: z.infer<typeof MessageId> | undefined;
      params?: unknown;
    }
  | { answered: z.infer<typeof MessageId> };

// Writing this file beside the request log releases every held `wait-for-release` step.
export const releaseMarker = (requestLog: string): string =>
  `${requestLog}.released`;
