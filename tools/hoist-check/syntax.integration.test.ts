import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { workspace } from './workspace-mock.ts';

const formatModule = 'packages/client/src/lib/format.ts';
const formatDeclaration = 'export const format = 1;';
const oneFormatConsumer = `${formatModule} [generic]: 1 production`;

it('ignores import syntax inside regular expressions', (): void => {
  const root = workspace({
    'packages/client/package.json':
      '{"name":"clientlib","exports":"./src/lib/format.ts"}',
    [formatModule]: formatDeclaration,
    'apps/one/src/view.ts': 'import { format } from "clientlib";',
    'apps/two/src/pattern.ts': 'export const pattern = /import("clientlib")/;',
  });
  expect(cliReport(root)).toContain(oneFormatConsumer);
});

it('resolves caller path aliases before workspace package exports', (): void => {
  const root = workspace({
    'packages/client/package.json':
      '{"name":"@repo/client","exports":"./src/index.ts"}',
    'packages/client/src/index.ts': formatDeclaration,
    [formatModule]: 'export const format = 2;',
    'apps/one/package.json': '{"name":"one"}',
    'apps/one/tsconfig.json':
      '{"compilerOptions":{"paths":{"@repo/client":["../../packages/client/src/lib/format.ts"]}}}',
    'apps/one/src/view.ts': 'import { format } from "@repo/client";',
  });
  expect(cliReport(root)).toContain(oneFormatConsumer);
});

it('reports relative imports in archives without their referenced tsconfig', (): void => {
  const root = workspace({
    'packages/client/package.json': '{"name":"@repo/client"}',
    'packages/client/tsconfig.json':
      '{"extends":"./missing-base.json","include":["src"]}',
    [formatModule]: formatDeclaration,
    'packages/client/src/view.tsx': 'import { format } from "./lib/format";',
  });
  expect(cliReport(root)).toContain(oneFormatConsumer);
});

function cliReport(root: string): string {
  return execFileSync(
    process.execPath,
    [fileURLToPath(new URL('../hoist-check.mts', import.meta.url)), root],
    { encoding: 'utf8' },
  );
}
