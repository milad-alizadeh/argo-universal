import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findExecutable } from '../src/find-executable';
import { readProtocolDeclarations } from './protocol-declarations';
const roots = [
  'InitializeParams',
  'InitializeResponse',
  'v2/ModelListParams',
  'v2/ModelListResponse',
  'v2/GetAccountParams',
  'v2/GetAccountResponse',
  'v2/ThreadStartParams',
  'v2/ThreadStartResponse',
  'v2/ThreadResumeParams',
  'v2/ThreadResumeResponse',
  'v2/TurnStartParams',
  'v2/TurnStartResponse',
  'v2/TurnInterruptParams',
  'v2/TurnInterruptResponse',
  'v2/ItemStartedNotification',
  'v2/ItemCompletedNotification',
  'v2/AgentMessageDeltaNotification',
  'v2/ReasoningSummaryTextDeltaNotification',
  'v2/ReasoningTextDeltaNotification',
  'v2/CommandExecutionOutputDeltaNotification',
  'v2/TurnStartedNotification',
  'v2/TurnCompletedNotification',
  'v2/ThreadTokenUsageUpdatedNotification',
  'v2/CommandExecutionRequestApprovalParams',
  'v2/CommandExecutionRequestApprovalResponse',
  'v2/FileChangeRequestApprovalParams',
  'v2/FileChangeRequestApprovalResponse',
  'v2/ToolRequestUserInputParams',
  'v2/ToolRequestUserInputResponse',
  'ServerNotification',
];
const directory = mkdtempSync(path.join(tmpdir(), 'agent-protocol-'));
const executable = findExecutable('codex', process.env);
if (!executable) throw new Error('Codex is not installed.');
try {
  const version = execFileSync(executable, ['--version'], {
    encoding: 'utf8',
  }).trim();
  execFileSync(executable, [
    'app-server',
    'generate-ts',
    '--out',
    directory,
    '--experimental',
  ]);
  const declarations = readProtocolDeclarations(directory, roots);
  writeFileSync(
    new URL('./protocol.gen.ts', import.meta.url),
    `// Generated from ${version}; run node packages/agents/codex/generate-protocol.ts.\n\nexport const codexProtocolVersion = ${JSON.stringify(version.replace(/^codex-cli /, ''))};\n\n${declarations.join('\n\n')}\n`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
execFileSync(
  process.execPath,
  [fileURLToPath(new URL('./generate-runtime-schemas.ts', import.meta.url))],
  { stdio: 'inherit' },
);
