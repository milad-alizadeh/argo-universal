import { drizzleSchemaBoundary } from './drizzle-schema-boundary.ts';
import { ruleTester } from './rule-tester.ts';

const schemaImport = "import { createSelectSchema } from 'drizzle-orm/zod';";
const schemaSources = [
  schemaImport,
  "export { createSelectSchema } from 'drizzle-orm/zod';",
  "export * from 'drizzle-orm/zod';",
  "await import('drizzle-orm/zod');",
  "require('drizzle-orm/zod');",
  "type Schema = typeof import('drizzle-orm/zod');",
  "import schema = require('drizzle-orm/zod');",
];
const columnsFile = '/repo/packages/contracts/src/columns.ts';
const outsideColumns = [
  '/repo/apps/server/src/services/sessions/session-data.ts',
  '/repo/packages/contracts/src/sessions/record.ts',
  '/repo/packages/db/src/columns.ts',
  '/repo/packages/contracts/src/columns.test.ts',
] as const;

interface AcceptedImport {
  code: string;
  filename: string;
}
interface RejectedImport extends AcceptedImport {
  errors: { messageId: string }[];
}

const acceptedColumnsImport = (code: string): AcceptedImport => ({
  code,
  filename: columnsFile,
});
const rejectedSchemaImport = (filename: string): RejectedImport => ({
  code: schemaImport,
  filename,
  errors: [{ messageId: 'drizzleSchemaBoundary' }],
});

ruleTester.run('drizzle-schema-boundary', drizzleSchemaBoundary, {
  valid: [
    ...schemaSources.map(acceptedColumnsImport),
    {
      code: "import { eq } from 'drizzle-orm';",
      filename: outsideColumns[0],
    },
  ],
  invalid: [
    ...outsideColumns.map(rejectedSchemaImport),
    ...schemaSources.slice(1).map((code): RejectedImport => ({
      code,
      filename: outsideColumns[0],
      errors: [{ messageId: 'drizzleSchemaBoundary' }],
    })),
  ],
});
