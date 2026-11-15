import { join } from 'node:path';
import type { McpServer } from '@agentclientprotocol/sdk';
import { argoInstructionsMarkdown } from '@repo/contracts/agents/argo-instructions';
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

  const opening = appendServer(
    input.opening,
    sessionServer(entry.access.environment, sessionId(input)),
  );

  return {
    ...input,
    opening: takesSystemPrompt ? withArgoInstructions(opening) : opening,
  };
}

function withArgoInstructions(opening: AcpSessionOpening): AcpSessionOpening {
  const systemPrompt: AcpSystemPrompt = {
    mode: 'append',
    content: [{ type: 'text', text: argoInstructionsMarkdown() }],
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

function sessionServer(
  { token, home, cliDirectory }: SessionProcessAccess['environment'],
  id: string,
): McpServer {
  return {
    name: `${productCompatibility.mcpServer}-${id.replaceAll('-', '')}`,
    command: join(cliDirectory, productCompatibility.command),
    args: ['mcp'],
    env: [
      { name: productCompatibility.environment.home, value: home },
      { name: productCompatibility.environment.token, value: token },
    ],
  };
}
