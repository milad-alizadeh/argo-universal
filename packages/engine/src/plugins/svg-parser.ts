import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { fetchText } from './svg-parser-fetch';
import { tags } from './svg-parser-tags';
import type { SvgAstNode, SvgParser } from './svg-sanitizer';

interface ParserModule {
  exports: {
    parse?: (source: string, middleware: (ast: unknown) => unknown) => unknown;
  };
}

function treeOf(value: unknown): SvgAstNode {
  if (!value || typeof value !== 'object')
    throw new Error('malformed SVG parser tree');
  const node = value as { tag?: unknown; props?: unknown; children?: unknown };

  if (
    typeof node.tag !== 'string' ||
    !node.props ||
    typeof node.props !== 'object' ||
    !Array.isArray(node.children)
  )
    throw new Error('malformed SVG parser node');

  return {
    tag: node.tag,
    props: node.props as Record<string, unknown>,
    children: node.children.map((child) =>
      typeof child === 'string' ? child : treeOf(child),
    ),
  };
}

function parser(): SvgParser {
  const directory = dirname(fileURLToPath(import.meta.url));
  const bundle = buildSync({
    stdin: {
      contents:
        "import { parse } from 'react-native-svg/lib/module/xml.js'; export { parse };",
      resolveDir: directory,
      sourcefile: 'svg-parser-adapter.ts',
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['react', './xmlTags', './utils/fetchData'],
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent',
  });
  const output = bundle.outputFiles[0];

  if (!output) throw new Error('The react-native-svg parser did not bundle');
  const runtime: ParserModule = { exports: {} };
  const nativeRequire = createRequire(import.meta.url);
  const require = (name: string): unknown => {
    if (name === './xmlTags') return { tags };
    if (name === './utils/fetchData') return { fetchText };
    return nativeRequire(name);
  };
  const execute = new Function('require', 'module', 'exports', output.text);

  execute(require, runtime, runtime.exports);
  const parse = runtime.exports.parse;

  if (!parse) throw new Error('react-native-svg does not export parse');

  return (source) => {
    let tree: SvgAstNode | null = null;

    parse(source, (ast) => {
      tree = treeOf(ast);
      return ast;
    });

    return tree;
  };
}

let loadedParser: SvgParser | undefined;

export function parseSvg(source: string): SvgAstNode | null {
  loadedParser ??= parser();
  return loadedParser(source);
}
