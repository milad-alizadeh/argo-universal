import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  findNodeAtLocation,
  parseTree,
  type ParseError,
  type Node,
} from 'jsonc-parser';
import { z } from 'zod';
import {
  sourceDiagnostic,
  type PluginDiagnostic,
  type SourceFile,
} from './authoring-diagnostics';
import { runtimeError } from './runtime-protocol';

export async function manifestDiagnostics(
  directory: string,
  error: Error,
): Promise<PluginDiagnostic[]> {
  const file = join(directory, 'plugin.json');
  const input = { file, source: await readFile(file, 'utf8').catch(() => '') };

  return inspectManifestError(input, error);
}

function inspectManifestError(
  input: SourceFile,
  error: Error,
): PluginDiagnostic[] {
  const errors: ParseError[] = [];
  const tree = parseTree(input.source, errors, { disallowComments: true });

  if (error instanceof z.ZodError)
    return error.issues.map((issue) => manifestIssue(input, tree, issue));

  return [manifestError(input, errors, error)];
}

function manifestIssue(
  input: SourceFile,
  tree: Node | undefined,
  issue: z.core.$ZodIssue,
): PluginDiagnostic {
  const path = issue.path.filter((part) => typeof part !== 'symbol');

  return sourceDiagnostic(
    input,
    issueOffset(tree, path),
    `${path.join('.')}: ${issue.message}`,
  );
}

function fieldOffset(input: SourceFile, error: Error): number {
  const field = error.message.startsWith('version')
    ? 'version'
    : otherField(error);

  return Math.max(0, input.source.indexOf(`"${field}"`));
}

function otherField(error: Error): string {
  return error.message.startsWith('main file') ? 'main' : 'engines';
}

function manifestError(
  input: SourceFile,
  errors: ParseError[],
  error: Error,
): PluginDiagnostic {
  return sourceDiagnostic(
    input,
    errors[0]?.offset ?? fieldOffset(input, error),
    runtimeError(error),
  );
}

function issueOffset(
  tree: Node | undefined,
  path: (string | number)[],
): number {
  const node = tree && findNodeAtLocation(tree, path);

  return node ? node.offset : 0;
}
