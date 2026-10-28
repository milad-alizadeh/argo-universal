// Shipped code is a package's `src` outside its tests, stories, mocks and fixtures.
const shipped = /^(?:packages|apps)\/(?!storybook\/)[^/]+\/src\//;

const testOnlyFile =
  /\.(?:test|stories|mocks)\.|-fixtures\.|(?:^|\/)(?:mocks|\.storybook)\//;

// The browser runner, and the story-test driver that wraps it.
const testOnlySource = /^vitest\/browser$|(?:^#|\/)mocks\/story-layout$/;

// Statements start their line; a quoted import inside a fixture string does not.
const fromSource =
  /^(?:(?:import|export)\b[^'"\n]*|\}[^'"\n]*)\bfrom\s+['"]([^'"]+)['"]/gm;

const bareSource = /^import\s+['"]([^'"]+)['"]/gm;

const specifiers = (source: string): string[] =>
  [fromSource, bareSource].flatMap((pattern): string[] =>
    [...source.matchAll(pattern)].map((match): string => match[1] ?? ''),
  );

const problem = (file: string, specifier: string): string[] =>
  testOnlySource.test(specifier)
    ? [
        `${file}: shipped code imports ${specifier}, which only tests may; move the use into a test, story or mock.`,
      ]
    : [];

export const testOnlyImportProblems = (
  file: string,
  source: string,
): string[] =>
  !shipped.test(file) || testOnlyFile.test(file)
    ? []
    : specifiers(source).flatMap((specifier): string[] =>
        problem(file, specifier),
      );
