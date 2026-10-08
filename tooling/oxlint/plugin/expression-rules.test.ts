import { databaseClient } from './database-client.ts';
import { jsonParseCast } from './json-parse-cast.ts';
import { noInternalMock } from './no-internal-mock.ts';
import { ruleTester } from './rule-tester.ts';
import { vendorName } from './vendor-name.ts';

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
