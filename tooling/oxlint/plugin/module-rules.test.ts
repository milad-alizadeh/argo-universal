import { apiTypeOnly } from './api-type-only.ts';
import { crossPackageImport } from './cross-package-import.ts';
import { ruleTester } from './rule-tester.ts';

const clientFile = '/repo/packages/client/src/screen.tsx';
const crossPackage = [{ messageId: 'crossPackageImport' }];
const apiValue = [{ messageId: 'apiTypeOnly' }];

ruleTester.run('cross-package-import', crossPackageImport, {
  valid: [
    "import { db } from '@repo/db';",
    "import { local } from './local';",
    "import { sibling } from '../sibling';",
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
      errors: crossPackage,
    },
  ],
});

ruleTester.run('api-type-only', apiTypeOnly, {
  valid: [
    {
      code: "import type { RequestMock } from '@repo/mocks/app';",
      filename: clientFile,
    },
    {
      code: "export type { RequestMock } from '@repo/mocks/app';",
      filename: clientFile,
    },
    { code: "import { z } from '@repo/mocksville';", filename: clientFile },
    {
      code: "import type Router = require('@repo/mocks/app');",
      filename: clientFile,
    },
    {
      code: "type Router = import('@repo/mocks/app').RequestMock;",
      filename: clientFile,
    },
    {
      code: "import type { AppRouter } from '@repo/engine/router';",
      filename: clientFile,
    },
    {
      code: "export type { AppRouter } from '@repo/engine/router';",
      filename: clientFile,
    },
  ],
  invalid: [
    {
      code: "import type { AppRouter } from '@repo/server/router';",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "import { appRouter } from '@repo/server/router';",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "import services = require('@repo/engine/mocks');",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "import router = require('@repo/mocks/app');",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "type Services = ReturnType<typeof import('@repo/engine/mocks').unreachableServices>;",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "type Router = import('@repo/engine/router').AppRouter;",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "import { appRouter } from '@repo/engine/router';",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "import type { AppRouter } from '@repo/engine/internal';",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "import type { Other } from '@repo/engine/router';",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "export type * from '@repo/engine/router';",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "await import('@repo/engine/router');",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "import { recordedFeedMocks } from '@repo/mocks/app';",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "import { type RequestMock } from '@repo/mocks/app';",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "export * from '@repo/mocks/app';",
      filename: clientFile,
      errors: apiValue,
    },
    {
      code: "await import('@repo/mocks/app');",
      filename: clientFile,
      errors: apiValue,
    },
  ],
});
