import type { SDKControlRequest } from '@anthropic-ai/claude-agent-sdk';
import { permissionOptions } from '@repo/contracts';
import type { AgentEvent } from '../src/agent-events';
import { toElicitationForm } from '../src/elicitation-form';

export function toRequestEvents(message: SDKControlRequest): AgentEvent[] {
  const request = message.request;
  if (request.subtype !== 'can_use_tool') return [];
  if (request.tool_name === 'ExitPlanMode') {
    const input = request.input as { plan: string; planFilePath?: string };
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
    const input = request.input as {
      questions: {
        question: string;
        header: string;
        options: { label: string; description: string }[];
        multiSelect?: boolean;
      }[];
    };
    return [
      {
        type: 'agent.elicitationRequested',
        request: {
          mode: 'form',
          message: input.questions
            .map((question) => question.question)
            .join('\n'),
          toolCallId: request.tool_use_id,
          requestedSchema: toElicitationForm(
            input.questions.map((question) => ({
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
        options: permissionOptions.map((option) => ({ ...option })),
      },
    },
  ];
}
