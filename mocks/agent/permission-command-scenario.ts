import { acpConfiguration } from './acp-configuration.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

const command = "printf 'ARGO_PERMISSION_BODY'";

const toolCallId = 'permission-command';

const unrelated: ScriptedStep = {
  type: 'update',
  update: {
    sessionUpdate: 'tool_call',
    toolCallId: 'unrelated-command',
    title: 'Other command',
    kind: 'execute',
    status: 'completed',
    rawInput: { command: 'DO_NOT_SHOW_OTHER_COMMAND' },
  },
};

const tool: ScriptedStep = {
  type: 'update',
  update: {
    sessionUpdate: 'tool_call',
    toolCallId,
    title: 'Run command',
    kind: 'execute',
    status: 'pending',
    rawInput: { command },
    content: [{ type: 'terminal', terminalId: toolCallId }],
    _meta: { terminal_info: { terminal_id: toolCallId, cwd: '/project' } },
  },
};

const permission = {
  type: 'permission',
  request: {
    toolCall: { toolCallId, title: 'Run command' },
    options: [
      { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
      { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
    ],
  },
} satisfies ScriptedStep;

const permissionCommandSteps: ScriptedStep[] = [
  unrelated,
  tool,
  permission,
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call_update',
      toolCallId,
      status: 'completed',
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'agent_message_chunk',
      content: {
        type: 'text',
        text: 'The shared fixture completed this Turn.',
      },
    },
  },
];

// The App releases the Agent only after observing the request without its Tool data.
const delayedPermissionCommandSteps: ScriptedStep[] = [
  unrelated,
  { ...permission, detached: true },
  { type: 'wait-for-release' },
  tool,
  { type: 'wait-for-cancel' },
];

const editReadme = { toolCallId: 'edit-readme', title: 'Edit README.md' };

const permissionEditSteps: ScriptedStep[] = [
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      ...editReadme,
      kind: 'edit',
      status: 'pending',
    },
  },
  {
    type: 'permission',
    request: {
      toolCall: editReadme,
      options: [
        { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
        { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
      ],
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call_update',
      toolCallId: editReadme.toolCallId,
      status: 'completed',
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'agent_message_chunk',
      content: {
        type: 'text',
        text: 'The shared fixture completed this Turn.',
      },
    },
  },
];

export const permissionScenarios = {
  permission: { configOptions: acpConfiguration, steps: permissionEditSteps },
  'permission-command': {
    configOptions: acpConfiguration,
    steps: permissionCommandSteps,
  },
  'permission-command-late': {
    configOptions: acpConfiguration,
    steps: delayedPermissionCommandSteps,
  },
} satisfies Record<string, ScriptedScenario>;
