import { join } from 'node:path';
import type { McpServer } from '@agentclientprotocol/sdk';
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
  const lease = await connection.open(withArgoMcp(input, entry));

  return { ...lease, connectionKind: entry.kind };
}

function withArgoMcp(input: AcpOpenInput, entry: EntryKind): AcpOpenInput {
  if (entry.kind === 'shared') return input;

  return {
    ...input,
    opening: appendServer(
      input.opening,
      argoServer(entry.access.environment, sessionId(input)),
    ),
  };
}

function sessionId(input: AcpOpenInput): string {
  if (input.sessionId !== undefined) return input.sessionId;

  throw new Error('Argo MCP access requires a Session id');
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

function argoServer(
  { token, home, cliDirectory }: SessionProcessAccess['environment'],
  id: string,
): McpServer {
  return {
    name: `argo-${id.replaceAll('-', '')}`,
    command: join(cliDirectory, 'argo'),
    args: ['mcp'],
    env: [
      { name: 'ARGO_HOME', value: home },
      { name: 'ARGO_TOKEN', value: token },
    ],
  };
}
