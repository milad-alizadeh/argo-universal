import { expect, it } from 'vitest';
import { buildHoistingReport } from './report.mts';
import { workspace } from './workspace-mock.ts';

it('ignores import syntax inside regular expressions', (): void => {
  const root = workspace({
    'packages/client/package.json':
      '{"name":"clientlib","exports":"./src/lib/format.ts"}',
    'packages/client/src/lib/format.ts': 'export const format = 1;',
    'apps/one/src/view.ts': 'import { format } from "clientlib";',
    'apps/two/src/pattern.ts': 'export const pattern = /import("clientlib")/;',
  });
  expect(buildHoistingReport(root)).toContain(
    'packages/client/src/lib/format.ts [generic]: 1 production',
  );
});

it('resolves caller path aliases before workspace package exports', (): void => {
  const root = workspace({
    'packages/client/package.json':
      '{"name":"@repo/client","exports":"./src/index.ts"}',
    'packages/client/src/index.ts': 'export const format = 1;',
    'packages/client/src/lib/format.ts': 'export const format = 2;',
    'apps/one/package.json': '{"name":"one"}',
    'apps/one/tsconfig.json':
      '{"compilerOptions":{"paths":{"@repo/client":["../../packages/client/src/lib/format.ts"]}}}',
    'apps/one/src/view.ts': 'import { format } from "@repo/client";',
  });
  expect(buildHoistingReport(root)).toContain(
    'packages/client/src/lib/format.ts [generic]: 1 production',
  );
});
