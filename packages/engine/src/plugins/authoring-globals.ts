import { extname } from 'node:path';
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping';
import { transform, type TransformResult } from 'esbuild';
import {
  sourceDiagnostic,
  type PluginDiagnostic,
  type SourceFile,
} from './authoring-diagnostics';

const nodeGlobals = [
  'process',
  'require',
  'module',
  'exports',
  'Buffer',
  '__dirname',
  '__filename',
  'global',
  'setImmediate',
  'clearImmediate',
];

const marker = '__argo_forbidden_Node_global_';

const define = Object.fromEntries(
  nodeGlobals.flatMap((name) => [
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
