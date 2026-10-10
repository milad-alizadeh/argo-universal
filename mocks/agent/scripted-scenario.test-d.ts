import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

// Type-checking fails if the SDK types stop rejecting any of these steps.
const missingContent = {
  type: 'update',
  update: { sessionUpdate: 'agent_message_chunk' },
} as const;
const unknownUpdate = {
  type: 'update',
  update: { sessionUpdate: 'agent_mood', mood: 'calm' },
} as const;
const unknownPermissionKind = {
  type: 'permission',
  request: {
    toolCall: { toolCallId: 'edit' },
    options: [{ optionId: 'maybe', name: 'Maybe', kind: 'allow_sometimes' }],
  },
} as const;

// @ts-expect-error An agent message chunk carries content.
export const rejectedChunk: ScriptedStep = missingContent;
// @ts-expect-error The SDK has no such Session update.
export const rejectedScenario: ScriptedScenario = { steps: [unknownUpdate] };
// @ts-expect-error Permission options use the SDK's option kinds.
export const rejectedPermission: ScriptedStep = unknownPermissionKind;
