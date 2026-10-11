import { posix } from 'node:path';

export type Sources = ReadonlyMap<string, string>;
type Walk = { sources: Sources; seen: Set<string> };

const nodeResource =
  /^(?:node:)?(?:fs|fs\/promises|sqlite|child_process|net|https?)$/;
const workspaceResource =
  /^(?:ws|@repo\/(?:db|git)(?:\/.*)?|@repo\/mocks\/(?:git|network)\/.*)$/;
const typeOnlyImport = /^(?:import|export) type\b[^;]*;/gm;
// Statements start their line; a quoted import inside a fixture string does not.
const fromSource =
  /^(?:(?:import|export)\b[^'"\n]*|\}[^'"\n]*)\bfrom\s+['"]([^'"]+)['"]/gm;
const bareSource = /^import\s+['"]([^'"]+)['"]/gm;
const unitTest = /(?<!\.integration)\.test\.(?:ts|tsx|mts)$/;
const mockFile = /(?:^|\/)mocks\//;
const extensions = ['', '.ts', '.tsx', '.mts', '/index.ts'];

const isResource = (specifier: string): boolean =>
  nodeResource.test(specifier) || workspaceResource.test(specifier);

const specifiers = (source: string): string[] =>
  [fromSource, bareSource].flatMap((pattern): string[] =>
    [...source.replace(typeOnlyImport, '').matchAll(pattern)].map(
      (match): string => match[1] ?? '',
    ),
  );

const packageRoot = (file: string): string =>
  /^(?:packages|apps)\/[^/]+/.exec(file)?.[0] ?? '';

// `#mocks/*` is the package's own mocks folder and `@repo/mocks/*` the shared one.
const mockBase = (from: string, specifier: string): string | undefined => {
  if (specifier.startsWith('#mocks/'))
    return `${packageRoot(from)}/mocks/${specifier.slice(7)}`;
  if (specifier.startsWith('@repo/mocks/'))
    return `mocks/${specifier.slice(12)}`;
  return undefined;
};

const importBase = (from: string, specifier: string): string | undefined =>
  specifier.startsWith('.')
    ? posix.join(posix.dirname(from), specifier)
    : mockBase(from, specifier);

// Only mock modules are followed: they are where a test hides a real resource.
const resolveMock = (
  from: string,
  specifier: string,
  sources: Sources,
): string | undefined => {
  const base = importBase(from, specifier);
  const found = extensions
    .map((extension): string => `${base}${extension}`)
    .find((path): boolean => base !== undefined && sources.has(path));
  return found !== undefined && mockFile.test(found) ? found : undefined;
};

const through = (
  file: string,
  specifier: string,
  walk: Walk,
): string | undefined => {
  if (isResource(specifier)) return `${file} imports ${specifier}`;
  const mock = resolveMock(file, specifier, walk.sources);
  return mock && reach(mock, walk);
};

const reach = (file: string, walk: Walk): string | undefined => {
  if (walk.seen.has(file)) return undefined;
  walk.seen.add(file);
  return specifiers(walk.sources.get(file) ?? '')
    .map((specifier): string | undefined => through(file, specifier, walk))
    .find((found): boolean => found !== undefined);
};

export const suffixProblems = (file: string, sources: Sources): string[] => {
  const found = unitTest.test(file)
    ? reach(file, { sources, seen: new Set() })
    : undefined;
  if (!found) return [];
  return [
    `${file}: a *.test file touches real infrastructure (${found}); rename it to *.integration.test or replace the resource at its port.`,
  ];
};
