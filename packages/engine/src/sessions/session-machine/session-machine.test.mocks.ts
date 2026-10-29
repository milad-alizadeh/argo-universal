import type {
  RequestPermissionResponse,
  CreateElicitationResponse,
} from '@agentclientprotocol/sdk';
import { permissionOptions } from '@repo/contracts';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';

export const fileQuestion = 'Which file?';

export const snapshotEvent = 'snapshot';

export const permissionTool = 'tool-1';

export const nextPermissionTool = 'tool-2';

export const optionId = 'allow_once';

export const promptInput = [{ type: 'text' as const, text: 'Hello' }];

export const rowUpsertEvent = 'row.upsert';

export const mixedQuestions = (
  permissions: RequestPermissionResponse[],
  elicitations: CreateElicitationResponse[],
): ScriptedScenario => ({
  steps: [
    {
      type: 'parallel',
      steps: [
        ...[permissionTool, nextPermissionTool].map((toolCallId) => ({
          type: 'permission' as const,
          request: {
            toolCall: { toolCallId, title: 'Read a file' },
            options: permissionOptions,
          },
          responses: permissions,
        })),
        {
          type: 'elicitation',
          request: {
            mode: 'form',
            message: fileQuestion,
            requestedSchema: {
              type: 'object',
              properties: { file: { type: 'string' } },
            },
          },
          responses: elicitations,
        },
      ],
    },
    { type: 'hold' },
  ],
});
