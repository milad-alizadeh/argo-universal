// Shipped code is a package's `src` outside its tests, stories, mocks and fixtures.
const shipped = /^(?:packages|apps)\/(?!storybook\/)[^/]+\/src\//;

const testOnlyFile =
  /\.(?:test|stories|mocks)\.|-fixtures\.|(?:^|\/)(?:mocks|\.storybook)\//;

// The browser runner, and the story-test driver that wraps it.
const testOnlySource =
  /^vitest\/browser$|\/mocks\/story-layout$|^#mocks\/story-layout$/;

const importSource =
  /^(?:(?:import|export)\b[^'"\n]*|\}[^'"\n]*)\bfrom\s+['"]([^'"]+)['"]|^import\s+['"]([^'"]+)['"]/gm;

export const testOnlyImportProblems = (
  file: string,
  source: string,
): string[] => {
  if (!shipped.test(file) || testOnlyFile.test(file)) return [];

  return [...source.matchAll(importSource)]
    .map((match): string => match[1] ?? match[2] ?? '')
    .filter((specifier): boolean => testOnlySource.test(specifier))
    .map(
      (specifier): string =>
        `${file}: shipped code imports ${specifier}, which only tests may; move the use into a test, story or mock.`,
    );
};
