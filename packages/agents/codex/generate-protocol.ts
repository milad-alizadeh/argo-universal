import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(tmpdir(), 'agent-protocol-'));
const roots = [
  'InitializeParams',
  'InitializeResponse',
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
];
try {
  const version = execFileSync('codex', ['--version'], {
    encoding: 'utf8',
  }).trim();
  execFileSync('codex', [
    'app-server',
    'generate-ts',
    '--out',
    directory,
    '--experimental',
  ]);
  const visited = new Set<string>();
  const typeNames = new Map<string, string[]>();
  const sources = new Map<string, string>();
  const declarations: string[] = [];
  const visit = (file: string) => {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/import type .* from "([^"]+)";/g)) {
      const dependency = match[1];
      if (dependency)
        visit(path.resolve(path.dirname(file), `${dependency}.ts`));
    }
    sources.set(file, source);
    const name = source.match(/export type (\w+)/)?.[1];
    if (name) typeNames.set(name, [...(typeNames.get(name) ?? []), file]);
  };
  for (const root of roots) visit(path.join(directory, `${root}.ts`));
  const nameFor = (name: string, file: string) =>
    (typeNames.get(name)?.length ?? 0) > 1 && path.dirname(file) === directory
      ? `Legacy${name}`
      : name;
  for (const [file, original] of sources) {
    let source = original;
    const ownName = source.match(/export type (\w+)/)?.[1];
    const names = new Map<string, string>();
    if (ownName) names.set(ownName, nameFor(ownName, file));
    for (const match of source.matchAll(
      /import type \{ (\w+) \} from "([^"]+)";/g,
    )) {
      const [, name, reference] = match;
      if (name && reference)
        names.set(
          name,
          nameFor(name, path.resolve(path.dirname(file), `${reference}.ts`)),
        );
    }
    source = source.replace(/import type .* from "[^"]+";\n/g, '');
    for (const [name, replacement] of names)
      source = source.replace(new RegExp(`\\b${name}\\b`, 'g'), replacement);
    declarations.push(
      source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\/\/.*\n/gm, '')
        .trim(),
    );
  }
  writeFileSync(
    new URL('./protocol.gen.ts', import.meta.url),
    `// Generated from ${version}; run node packages/agents/codex/generate-protocol.ts.\n\n${declarations.join('\n\n')}\n`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
