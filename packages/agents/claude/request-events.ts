import {
  PlanMarkdown,
  permissionOptions,
  type PermissionOption,
} from '@repo/contracts';
import { parseAgentEvent, type AgentEvent } from '../src/agent-events';
import { dictionary } from './dictionary';
import type { SDKControlRequest } from './messages';

export function toRequestEvents(message: SDKControlRequest): AgentEvent[] {
  const request = message.request;
  if (request.subtype !== 'can_use_tool') return [];
  if (request.tool_name === 'ExitPlanMode') {
    const input = request.input;
    const plan = PlanMarkdown.parse({
      type: 'markdown',
      planId: `${request.tool_use_id}:plan`,
      content: input.plan,
      _meta: {
        argo: { requestId: message.request_id, filePath: input.planFilePath },
      },
    });
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
            plan,
          },
        },
      },
      { type: 'agent.planProposed', planId, content: plan.content },
    ];
  }
  if (request.tool_name === 'AskUserQuestion') {
    const input = request.input;
    if (!Array.isArray(input.questions)) throw new Error('Expected questions');
    const questions = input.questions.map(
      (question: unknown): Record<string, unknown> => dictionary(question),
    );
    const names = questions.map((question): unknown => question.question);
    const requestedSchema = {
      type: 'object',
      properties: Object.fromEntries(
        questions.map((question, index): [string, unknown] => {
          if (!Array.isArray(question.options))
            throw new Error('Expected question options');
          const choices = question.options.map((option: unknown): object => {
            const fields = dictionary(option);
            return {
              const: fields.label,
              title: fields.label,
              description: fields.description,
            };
          });
          return [
            typeof names[index] === 'string' ? names[index] : '',
            {
              type: question.multiSelect === true ? 'array' : 'string',
              title: question.header,
              description: question.question,
              ...(question.multiSelect === true
                ? { items: { anyOf: choices } }
                : { oneOf: choices }),
            },
          ];
        }),
      ),
      required: names,
    };
    return [
      parseAgentEvent({
        type: 'agent.elicitationRequested',
        request: {
          mode: 'form',
          message: names.join('\n'),
          toolCallId: request.tool_use_id,
          requestedSchema,
        },
      }),
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
