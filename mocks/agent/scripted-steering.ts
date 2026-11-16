import type { AgentApp, PromptRequest } from '@agentclientprotocol/sdk';
import { z } from 'zod';

export interface ScriptedSteering {
  received?: { resolve: (request: ScriptedSteeringRequest) => void };
  result: unknown;
}

const steeringRequest = z.object({
  sessionId: z.string(),
  prompt: z.array(z.custom<PromptRequest['prompt'][number]>()),
  _meta: z.record(z.string(), z.unknown()).optional(),
});

type ScriptedSteeringRequest = z.infer<typeof steeringRequest>;

export function serveSteering(
  app: AgentApp,
  steering: ScriptedSteering | undefined,
): AgentApp {
  if (!steering) return app;

  return app.onRequest('_session/steering', steeringRequest, ({ params }) => {
    steering.received?.resolve(params);

    return steering.result;
  });
}
