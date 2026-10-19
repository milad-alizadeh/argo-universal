import { extname } from 'node:path';
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping';
import { transform, type TransformResult } from 'esbuild';
import { realmGlobals } from '../worker/realm';
import {
  sourceDiagnostic,
  type PluginDiagnostic,
  type SourceFile,
} from './diagnostics';

// CommonJS module names, which Node gives every file but no Plugin realm has.
const moduleNames = ['require', 'module', 'exports', '__dirname', '__filename'];

// Names Plugin code can't reach: those Node gives the Server that a Plugin realm lacks.
function unavailableGlobals(): string[] {
  const realm = realmGlobals();

  return [...Object.getOwnPropertyNames(globalThis), ...moduleNames].filter(
    (name) => !realm.has(name) && /^[A-Za-z_$][\w$]*$/.test(name),
  );
}

const marker = '__argo_forbidden_Node_global_';

const define = Object.fromEntries(
  unavailableGlobals().flatMap((name) => [
    [name, marker + name],
    [`globalThis.${name}`, marker + name],
  ]),
);

const commonJsDefine = Object.fromEntries(
  Object.entries(define).filter(
    ([name]) => !['module', 'exports'].includes(name),
  ),
);

// esbuild resolves lexical bindings before replacing globals, so local names and property names stay legal.
export async function inspectGlobals(
  input: SourceFile,
): Promise<PluginDiagnostic[]> {
  const output = await transform(input.source, {
    loader: extname(input.file) === '.ts' ? 'ts' : 'tsx',
    sourcefile: input.file,
    define: input.commonJs ? commonJsDefine : define,
    sourcemap: 'external',
  });

  const map = new TraceMap(output.map);

  return [...output.code.matchAll(/__argo_forbidden_Node_global_(\w+)/g)].map(
    (match) => diagnostic(input, { output, map }, match),
  );
}

function diagnostic(
  input: SourceFile,
  build: { output: TransformResult; map: TraceMap },
  match: RegExpExecArray,
): PluginDiagnostic {
  const original = sourcePosition(input, build, match.index);

  return {
    file: input.file,
    line: original.line ?? 1,
    column: (original.column ?? 0) + 1,
    message: `Node global ${String(match[1])} is unavailable; use argo`,
  };
}

function sourcePosition(
  input: SourceFile,
  build: { output: TransformResult; map: TraceMap },
  offset: number,
): ReturnType<typeof originalPositionFor> {
  const generated = sourceDiagnostic(
    { file: input.file, source: build.output.code },
    offset,
    '',
  );

  return originalPositionFor(build.map, {
    line: generated.line,
    column: generated.column - 1,
  });
}
