import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  findNodeAtLocation,
  parseTree,
  type ParseError,
  type Node,
} from 'jsonc-parser';
import { z } from 'zod';
import { ManifestFieldError } from '../discovery/manifest';
import { runtimeError } from '../protocol/runtime';
import {
  sourceDiagnostic,
  type PluginDiagnostic,
  type SourceFile,
} from './diagnostics';

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

  return [manifestError({ input, tree, errors }, error)];
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

type ParsedManifest = {
  input: SourceFile;
  tree: Node | undefined;
  errors: ParseError[];
};

function manifestError(
  { input, tree, errors }: ParsedManifest,
  error: Error,
): PluginDiagnostic {
  return sourceDiagnostic(
    input,
    errors[0]?.offset ?? issueOffset(tree, fieldPath(error)),
    runtimeError(error),
  );
}

function fieldPath(error: Error): string[] {
  return error instanceof ManifestFieldError ? error.field : [];
}

function issueOffset(
  tree: Node | undefined,
  path: (string | number)[],
): number {
  const node = tree && findNodeAtLocation(tree, path);

  return node ? node.offset : 0;
}
