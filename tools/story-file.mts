import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type ArgsBlock, argsBlocks, bare } from './story-blocks.mts';
import { root, trackedFiles } from './tracked-files.mts';

/*
 * The one place that knows how a story file is spelled. The gates, the title check, the render
 * planner and `pnpm new:story` all ask what a story file holds through `readStory`, so they cannot
 * disagree on what a story is. The reading is text-based, not an AST: the gates also read the
 * snippets their tests write, and a snippet that does not parse whole still has to be read.
 */

// A story file as the checkers read it off disk.
export type StoryFile = { file: string; source: string };

export type StoryExport = { name: string; start: number; headerEnd: number };

export type { ArgsBlock } from './story-blocks.mts';

export type NamedImport = { names: string[]; from: string };

export type StoryRead = {
  /* The meta object's source, which is where a story file declares what it documents. */
  meta: string;
  title: string | undefined;
  component: string | undefined;
  exports: StoryExport[];
  imports: NamedImport[];
  /* Each `args: {` in the file, with the story it belongs to ('meta' for the meta's own). */
  argsBlocks: ArgsBlock[];
};

export const storySuffix = '.stories.tsx';

export const storyPath = /\.stories\.tsx$/;

export const testStory = /\.test\.stories\.tsx$/;

const metaOpens = 'const meta = {';

const metaCloses = '\n};';

const metaTitle = /\btitle: '([^']+)'/;

// Horizontal space only: `\s` spans newlines under `m`, which costs backtracking for no gain.
const metaComponent = /^[ \t]*component:[ \t]*(\w+)/m;

// A story is an `export const` of its own, annotated (`: Story`) or built (`= action(...)`).
const exportHeader = /^export const (\w+)(?=\s*[:=])/gm;

const namedImport =
  /^import[ \t]+(?:type[ \t]+)?\{([^}]*)\}[ \t\n]*from[ \t]*['"]([^'"]+)['"]/gm;

const identifier = /[\w$]+/g;

const startOf = (match: RegExpMatchArray): number => match.index ?? 0;

const group = (match: RegExpMatchArray, index: number): string =>
  match[index] ?? '';

// Sliced rather than matched: a meta holds nested braces, which a regex pays for in backtracking.
const metaOf = (source: string): string => {
  const opens = source.indexOf(metaOpens);

  if (opens < 0) return '';

  const closes = source.indexOf(metaCloses, opens);

  return closes < 0 ? source.slice(opens) : source.slice(opens, closes);
};

// Whether an object body sets `key` on a line of its own.
export const declaresKey = (body: string, key: string): boolean =>
  new RegExp(`^[ \\t]*${key}:`, 'm').test(body);

const storyExports = (source: string): StoryExport[] =>
  [...source.matchAll(exportHeader)].map((match): StoryExport => ({
    name: group(match, 1),
    start: startOf(match),
    headerEnd: startOf(match) + match[0].length,
  }));

export const namedImports = (source: string): NamedImport[] =>
  [...source.matchAll(namedImport)].map((match): NamedImport => ({
    names: [...group(match, 1).matchAll(identifier)].map((name): string =>
      group(name, 0),
    ),
    from: group(match, 2),
  }));

export const readStory = ({ source }: StoryFile): StoryRead => {
  const meta = metaOf(source);
  const exports = storyExports(source);

  return {
    meta,
    title: metaTitle.exec(meta)?.[1],
    component: metaComponent.exec(meta)?.[1],
    exports,
    imports: namedImports(source),
    argsBlocks: argsBlocks(source, storyExports(bare(source))),
  };
};

/*
 * Every file the pathspecs match in the working tree, tracked or not. A story written but not yet
 * `git add`ed is checked as the commit will hold it, so a gate cannot pass locally and fail once
 * the file is added.
 */
export const loadSources = (pathspecs: readonly string[]): StoryFile[] =>
  trackedFiles(pathspecs, { untracked: true }).map((file): StoryFile => ({
    file,
    source: readFileSync(resolve(root, file), 'utf8'),
  }));

export const loadStoryFiles = (
  pathspecs: readonly string[] = [`*${storySuffix}`],
): StoryFile[] => loadSources(pathspecs);
