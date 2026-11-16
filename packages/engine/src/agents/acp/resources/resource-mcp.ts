import { join } from 'node:path';
import type { McpServer } from '@agentclientprotocol/sdk';
import {
  argoInstructionsMarkdown,
  type ArgoInstructionChoices,
} from '@repo/contracts/agents/argo-instructions';
import {
  productName,
  productCompatibility,
} from '@repo/contracts/product-identity';
import type { AcpConnection } from '../connection/connection';
import type {
  EntryKind,
  AcpOpenInput,
  AcpSessionOpening,
  SessionProcessAccess,
  AcpSessionLease,
  AcpSystemPrompt,
} from './resource-types';

export async function openResourceSession(
  connection: AcpConnection,
  input: AcpOpenInput,
  entry: EntryKind,
): Promise<AcpSessionLease> {
  const lease = await connection.open(
    withSessionMcp(input, entry, connection.takesSystemPrompt()),
  );

  return { ...lease, connectionKind: entry.kind };
}

// A Session with Agent access gets its Argo MCP server and, when the Agent takes one, the Argo instructions as its system prompt (ADR-0053).
function withSessionMcp(
  input: AcpOpenInput,
  entry: EntryKind,
  takesSystemPrompt: boolean,
): AcpOpenInput {
  if (entry.kind === 'shared') return input;

  const choices = { todoList: entry.access.todoList !== false };
  const server = sessionServer(entry.access, sessionId(input), choices);
  const opening = appendServer(input.opening, server);

  if (!takesSystemPrompt) return { ...input, opening };

  return { ...input, opening: withArgoInstructions(opening, choices) };
}

function withArgoInstructions(
  opening: AcpSessionOpening,
  choices: ArgoInstructionChoices,
): AcpSessionOpening {
  const systemPrompt: AcpSystemPrompt = {
    mode: 'append',
    content: [{ type: 'text', text: argoInstructionsMarkdown(choices) }],
  };

  return withParams(opening, { systemPrompt });
}

function sessionId(input: AcpOpenInput): string {
  if (input.sessionId !== undefined) return input.sessionId;

  throw new Error(`${productName} MCP access requires a Session id`);
}

function appendServer(
  opening: AcpSessionOpening,
  server: McpServer,
): AcpSessionOpening {
  const mcpServers: McpServer[] = [
    ...(opening.params.mcpServers ?? []),
    server,
  ];

  return withParams(opening, { mcpServers });
}

function withParams(
  opening: AcpSessionOpening,
  params: { mcpServers?: McpServer[]; systemPrompt?: AcpSystemPrompt },
): AcpSessionOpening {
  if (opening.method === 'session/new')
    return { method: 'session/new', params: { ...opening.params, ...params } };

  return {
    method: 'session/resume',
    params: { ...opening.params, ...params },
  };
}

const { environment } = productCompatibility;

// What `argo mcp` starts with: where the Server is, the Session's token, and `0` when the person turned the checklist off, so its instruction is left out.
const serverVariables = (
  { token, home }: SessionProcessAccess['environment'],
  choices: ArgoInstructionChoices,
): { name: string; value: string }[] => [
  { name: environment.home, value: home },
  { name: environment.token, value: token },
  ...(choices.todoList ? [] : [{ name: environment.todoList, value: '0' }]),
];

function sessionServer(
  access: SessionProcessAccess,
  id: string,
  choices: ArgoInstructionChoices,
): McpServer {
  return {
    name: `${productCompatibility.mcpServer}-${id.replaceAll('-', '')}`,
    command: join(
      access.environment.cliDirectory,
      productCompatibility.command,
    ),
    args: ['mcp'],
    env: serverVariables(access.environment, choices),
  };
}
