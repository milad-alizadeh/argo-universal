import { permissionOptions, type PermissionOption } from '@repo/contracts';
import type { AgentEvent } from '../src/agent-events';
import {
  toElicitationForm,
  type ElicitationQuestion,
} from '../src/elicitation-form';
import type { MappedControlRequest } from './messages';
import { isAskUserQuestionInput, isExitPlanModeInput } from './tool-inputs.ts';

export function toRequestEvents(message: MappedControlRequest): AgentEvent[] {
  const request = message.request;
  if (request.subtype !== 'can_use_tool') return [];
  if (request.tool_name === 'ExitPlanMode') {
    const input = request.input;
    if (!isExitPlanModeInput(input)) return [];
    const planId = `${request.tool_use_id}:plan`;
    return [
      {
        type: 'agent.feed',
        change: {
          type: 'upsert',
          update: {
            id: planId,
            sessionUpdate: 'plan_update',
            state: 'settled',
            plan: {
              type: 'markdown',
              planId,
              content: input.plan,
              _meta: {
                argo: {
                  requestId: message.request_id,
                  filePath: input.planFilePath,
                },
              },
            },
          },
        },
      },
      { type: 'agent.planProposed', planId, content: input.plan },
    ];
  }
  if (request.tool_name === 'AskUserQuestion') {
    const input = request.input;
    if (!isAskUserQuestionInput(input)) return [];
    return [
      {
        type: 'agent.elicitationRequested',
        request: {
          mode: 'form',
          message: input.questions
            .map((question): string => question.question)
            .join('\n'),
          toolCallId: request.tool_use_id,
          requestedSchema: toElicitationForm(
            input.questions.map((question): ElicitationQuestion => ({
              id: question.question,
              title: question.header,
              question: question.question,
              options: question.options,
              multiple: question.multiSelect,
            })),
          ),
        },
      },
    ];
  }
  return [
    {
      type: 'agent.permissionRequested',
      request: {
        toolCallId: request.tool_use_id,
        title: request.tool_name,
        options: permissionOptions.map((option): PermissionOption => ({
          ...option,
        })),
      },
    },
  ];
}
