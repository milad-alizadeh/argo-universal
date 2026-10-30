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

// Only private Session connections receive Argo tools and that Session's own token.
function withArgoMcp(input: AcpOpenInput, entry: EntryKind): AcpOpenInput {
  if (entry.kind === 'shared') return input;

  return {
    ...input,
    opening: appendServer(input.opening, argoServer(entry.access.environment)),
  };
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

function argoServer({
  token,
  home,
  cliDirectory,
}: SessionProcessAccess['environment']): McpServer {
  return {
    name: 'argo',
    command: join(cliDirectory, 'argo'),
    args: ['mcp'],
    env: [
      { name: 'ARGO_HOME', value: home },
      { name: 'ARGO_TOKEN', value: token },
    ],
  };
}
