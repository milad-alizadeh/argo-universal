import { apiTypeOnly } from './api-type-only.ts';
import { crossPackageImport } from './cross-package-import.ts';
import { ruleTester } from './rule-tester.ts';

const clientFile = '/repo/packages/client/src/screen.tsx';
const claudeMock = '/repo/mocks/cli/claude/mock-claude.ts';
const crossPackage = [{ messageId: 'crossPackageImport' }];
const apiValue = [{ messageId: 'apiTypeOnly' }];

ruleTester.run('cross-package-import', crossPackageImport, {
  valid: [
    "import { db } from '@repo/db';",
    "import { local } from './local';",
    "import { sibling } from '../sibling';",
    {
      code: "import type { Event } from '../../../packages/agents/claude/types';",
      filename: claudeMock,
    },
  ],
  invalid: [
    {
      code: "import { db } from '../../packages/db/src/index';",
      errors: crossPackage,
    },
    {
      code: "export * from '../../tooling/vitest/node';",
      errors: crossPackage,
    },
    {
      code: "await import('../../apps/server/src/main');",
      errors: crossPackage,
    },
    { code: "require('../../packages/git/src');", errors: crossPackage },
    {
      code: "import type { Event } from '../../../packages/agents/codex/types';",
      filename: claudeMock,
      errors: crossPackage,
    },
  ],
});

ruleTester.run('api-type-only', apiTypeOnly, {
  valid: [
    {
      code: "import type { AppRouter } from '@repo/api';",
      filename: clientFile,
    },
    {
      code: "export type { AppRouter } from '@repo/api';",
      filename: clientFile,
    },
    { code: "import { z } from '@repo/apis';", filename: clientFile },
  ],
  invalid: [
    {
      code: "import { appRouter } from '@repo/api';",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "import { type AppRouter } from '@repo/api/router';",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "export * from '@repo/api';",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "await import('@repo/api');",
      filename: clientFile,
      errors: apiValue,
    },
  ],
});
