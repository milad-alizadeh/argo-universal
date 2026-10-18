import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync, type BuildOptions } from 'esbuild';
import { type SvgAstNode, type SvgParser } from './svg-types';

interface ParserStyles {
  [property: string]: string;
}

type ParserPropValue = string | number | boolean | ParserStyles;

interface ParserAstNode {
  tag: string;
  props: Record<string, ParserPropValue | undefined>;
  children: Array<string | ParserAstNode>;
}

interface ParserModule {
  parse: (
    source: string,
    middleware: (ast: ParserAstNode) => ParserAstNode,
  ) => ParserAstNode | null;
}

const buildDefaults: BuildOptions = {
  bundle: true,
  external: ['./xmlTags', './utils/fetchData'],
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'silent',
};

function treeOf(ast: ParserAstNode): SvgAstNode {
  const props: SvgAstNode['props'] = {};

  for (const [name, value] of Object.entries(ast.props)) {
    if (value !== undefined) props[name] = propValue(value);
  }

  return {
    tag: ast.tag,
    props,
    children: ast.children.map((child) =>
      typeof child === 'string' ? child : treeOf(child),
    ),
  };
}

function propValue(value: ParserPropValue): string {
  if (typeof value !== 'object') return String(value);

  throw new Error('unsupported parsed SVG attribute value');
}

function parser(): SvgParser {
  const directory = dirname(fileURLToPath(import.meta.url));
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'argo-svg-parser-'));
  const outputPath = join(temporaryDirectory, 'parser.cjs');

  try {
    writeParserShims(temporaryDirectory);
    compileParser(directory, outputPath);

    const runtime: ParserModule = createRequire(import.meta.url)(outputPath);

    return adaptParser(runtime.parse);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function writeParserShims(directory: string): void {
  mkdirSync(join(directory, 'utils'));
  writeFileSync(join(directory, 'package.json'), '{"type":"commonjs"}');
  writeFileSync(join(directory, 'xmlTags.js'), 'exports.tags = {};');
  writeFileSync(
    join(directory, 'utils/fetchData.js'),
    "exports.fetchText = async () => { throw new Error('SVG URL fetching is disabled'); };",
  );
}

function compileParser(directory: string, outputPath: string): void {
  buildSync({ ...buildDefaults, ...parserEntries(directory, outputPath) });
}

function parserEntries(directory: string, outputPath: string): BuildOptions {
  return {
    stdin: {
      contents:
        "import { parse } from 'react-native-svg/lib/module/xml.js'; export { parse };",
      resolveDir: directory,
      sourcefile: 'svg-parser-adapter.ts',
    },
    outfile: outputPath,
  };
}

function adaptParser(parse: ParserModule['parse']): SvgParser {
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
