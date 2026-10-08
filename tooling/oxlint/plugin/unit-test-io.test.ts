import { ruleTester } from './rule-tester.ts';
import { unitTestIo } from './unit-test-io.ts';

const unitFilename = '/repo/example.test.ts';
const integrationFilename = '/repo/example.integration.test.ts';
const sources = [
  'node:fs',
  'node:fs/promises',
  'node:sqlite',
  'node:child_process',
  'node:net',
  'node:http',
  'node:https',
  '@repo/db',
  '@repo/git',
];
const resourceImports = sources.map(
  (source): string => `import * as resource from '${source}';`,
);
const wallClockRead = 'const started = Date.now();';
const ambientReads = [
  'const mode = process.env.MODE;',
  "const mode = process['env'].MODE;",
  'const { MODE } = process.env;',
  wallClockRead,
  "const started = Date['now']();",
  'const today = new Date();',
  'const started = performance.now();',
  "const started = performance['now']();",
];
const moduleForms = [
  "export { readFile } from 'node:fs';",
  "export * from 'node:fs/promises';",
  "await import('node:sqlite');",
  "require('node:child_process');",
  "import * as resource from 'fs';",
  "import * as resource from '@repo/db/client';",
  "import * as resource from '@repo/git/diff';",
];
const forbidden = [...resourceImports, ...ambientReads, ...moduleForms];
interface TestCase {
  code: string;
  filename: string;
}
interface RejectedCase extends TestCase {
  errors: { messageId: string }[];
}
const allowed = (code: string): TestCase => ({
  code,
  filename: integrationFilename,
});
const rejected = (code: string): RejectedCase => ({
  code,
  filename: unitFilename,
  errors: [{ messageId: 'unitTestIo' }],
});

ruleTester.run('unit-test-io', unitTestIo, {
  valid: [
    ...forbidden.map(allowed),
    { code: 'const today = new Date(0);', filename: unitFilename },
    { code: 'const started = input.now();', filename: unitFilename },
    { code: "import { join } from 'node:path';", filename: unitFilename },
    { code: wallClockRead, filename: '/repo/service.ts' },
    {
      code: wallClockRead,
      filename: '/repo/service.test.stories.tsx',
    },
    {
      code: wallClockRead,
      filename: '/repo/service.integration.test.mts',
    },
  ],
  invalid: [
    ...forbidden.map(rejected),
    { ...rejected(ambientReads[0] ?? ''), filename: '/repo/example.test.mts' },
    { ...rejected(ambientReads[0] ?? ''), filename: '/repo/example.test.tsx' },
  ],
});
