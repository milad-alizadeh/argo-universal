import { databaseClient } from './database-client.ts';
import { jsonParseCast } from './json-parse-cast.ts';
import { noInternalMock } from './no-internal-mock.ts';
import { ruleTester } from './rule-tester.ts';
import { staticImports } from './static-imports.ts';
import { vendorName } from './vendor-name.ts';

const rendererLoader =
  '/repo/apps/codemap-834-prototype/src/renderer-loader.web.tsx';

ruleTester.run('vendor-name', vendorName, {
  valid: ["const agent = 'anthropic';", "const name = 'claudette';"],
  invalid: [
    {
      code: "if (agent === 'claude') run();",
      errors: [{ messageId: 'vendorName' }],
    },
    { code: 'const agent = "codex";', errors: [{ messageId: 'vendorName' }] },
  ],
});

ruleTester.run('json-parse-cast', jsonParseCast, {
  valid: [
    'const value = schema.parse(JSON.parse(text));',
    'const n = x as const;',
  ],
  invalid: [
    {
      code: 'const value = JSON.parse(text) as Settings;',
      errors: [{ messageId: 'jsonParseCast' }],
    },
  ],
});

ruleTester.run('database-client', databaseClient, {
  valid: ['const database = openDatabase(path);'],
  invalid: [
    {
      code: "const database = new DatabaseSync(':memory:');",
      errors: [{ messageId: 'databaseClient' }],
    },
  ],
});

ruleTester.run('no-internal-mock', noInternalMock, {
  valid: [
    "vi.mock('node:fs');",
    "vi.mock('electron', () => ({}));",
    'vi.mock(name);',
  ],
  invalid: [
    { code: "vi.mock('./clock');", errors: [{ messageId: 'noInternalMock' }] },
    {
      code: "vi.doMock('@repo/db', () => ({}));",
      errors: [{ messageId: 'noInternalMock' }],
    },
    { code: 'vi.mock(`../store`);', errors: [{ messageId: 'noInternalMock' }] },
  ],
});

ruleTester.run('static-imports', staticImports, {
  valid: [
    "import { load } from './module';",
    "import type { Shape } from './module';",
    'const expression = "import(\'./module\')";',
    { code: "await import('./three-map.web');", filename: rendererLoader },
    { code: "await import('./flat-map.web');", filename: rendererLoader },
  ],
  invalid: [
    {
      code: "await import('./three-map.web');",
      filename: '/repo/another-loader.tsx',
      errors: [{ messageId: 'staticImports' }],
    },
    {
      code: "await import('./flat-map.web');",
      filename: rendererLoader.replace('codemap-834-prototype', 'another-app'),
      errors: [{ messageId: 'staticImports' }],
    },
    {
      code: "await import('./another-module');",
      filename: rendererLoader,
      errors: [{ messageId: 'staticImports' }],
    },
    {
      code: "const path = './flat-map.web'; import(path);",
      filename: rendererLoader,
      errors: [{ messageId: 'staticImports' }],
    },
    {
      code: "type Module = typeof import('./flat-map.web');",
      filename: rendererLoader,
      errors: [{ messageId: 'staticImports' }],
    },
    {
      code: "await import('./module');",
      errors: [{ messageId: 'staticImports' }],
    },
    { code: 'import(modulePath);', errors: [{ messageId: 'staticImports' }] },
    {
      code: "type Shape = import('./module').Shape;",
      errors: [{ messageId: 'staticImports' }],
    },
    {
      code: "type Module = typeof import('./module');",
      errors: [{ messageId: 'staticImports' }],
    },
  ],
});
