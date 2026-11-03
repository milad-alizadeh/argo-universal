import { join } from 'node:path';
import type { McpServer } from '@agentclientprotocol/sdk';
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
} from './resource-types';

export async function openResourceSession(
  connection: AcpConnection,
  input: AcpOpenInput,
  entry: EntryKind,
): Promise<AcpSessionLease> {
  const lease = await connection.open(withSessionMcp(input, entry));

  return { ...lease, connectionKind: entry.kind };
}

function withSessionMcp(input: AcpOpenInput, entry: EntryKind): AcpOpenInput {
  if (entry.kind === 'shared') return input;

  return {
    ...input,
    opening: appendServer(
      input.opening,
      sessionServer(entry.access.environment, sessionId(input)),
    ),
  };
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

  if (opening.method === 'session/new')
    return { method: 'session/new', params: { ...opening.params, mcpServers } };

  return {
    method: 'session/resume',
    params: { ...opening.params, mcpServers },
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
