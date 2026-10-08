import {
  PlanMarkdown,
  permissionOptions,
  type PermissionOption,
} from '@repo/contracts';
import type { AgentEvent } from '../src/agent-events';
import { toElicitationRequest } from '../src/elicitation-form';
import { dictionary } from './dictionary';
import type { SDKControlRequest } from './messages';

type ToolRequest = Extract<
  SDKControlRequest['request'],
  { subtype: 'can_use_tool' }
>;
export function toRequestEvents(message: SDKControlRequest): AgentEvent[] {
  const request = message.request;
  if (request.subtype !== 'can_use_tool') return [];
  if (request.tool_name === 'ExitPlanMode') return planEvents(message, request);
  return toolRequestEvents(request);
}
function toolRequestEvents(request: ToolRequest): AgentEvent[] {
  return request.tool_name === 'AskUserQuestion'
    ? questionEvents(request)
    : permissionEvents(request);
}
function proposedPlan(
  message: SDKControlRequest,
  request: ToolRequest,
): PlanMarkdown {
  const argo = {
    requestId: message.request_id,
    filePath: request.input.planFilePath,
  };
  return PlanMarkdown.parse({
    type: 'markdown',
    planId: `${request.tool_use_id}:plan`,
    content: request.input.plan,
    _meta: { argo },
  });
}
function planEvents(
  message: SDKControlRequest,
  request: ToolRequest,
): AgentEvent[] {
  const plan = proposedPlan(message, request);
  const planId = `${request.tool_use_id}:plan`;
  return [
    planRow(planId, plan),
    { type: 'agent.planProposed', planId, content: plan.content },
  ];
}
function planRow(id: string, plan: PlanMarkdown): AgentEvent {
  return {
    type: 'agent.feed',
    change: {
      type: 'upsert',
      update: { id, sessionUpdate: 'plan_update', state: 'settled', plan },
    },
  };
}
function questionEvents(request: ToolRequest): AgentEvent[] {
  if (!Array.isArray(request.input.questions))
    throw new Error('Expected questions');
  return [
    toElicitationRequest(
      request.tool_use_id,
      request.input.questions.map(questionProjection),
    ),
  ];
}
function questionProjection(
  question: unknown,
): Parameters<typeof toElicitationRequest>[1][number] {
  const fields = dictionary(question);
  if (!Array.isArray(fields.options))
    throw new Error('Expected question options');
  return {
    id: fields.question,
    title: fields.header,
    question: fields.question,
    multiple: fields.multiSelect === true,
    options: fields.options.map(questionOption),
  };
}
function questionOption(
  option: unknown,
): Parameters<typeof toElicitationRequest>[1][number]['options'][number] {
  const fields = dictionary(option);
  return { label: fields.label, description: fields.description };
}
function permissionEvents(request: ToolRequest): AgentEvent[] {
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
