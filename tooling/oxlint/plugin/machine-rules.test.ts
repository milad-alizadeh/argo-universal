import { childProcessImport } from './child-process.ts';
import { machineClock } from './machine-clock.ts';
import { ruleTester } from './rule-tester.ts';

const childProcess = [{ messageId: 'childProcess' }];
const clock = [{ messageId: 'machineClock' }];

ruleTester.run('child-process', childProcessImport, {
  valid: [
    "import { join } from 'node:path';",
    "import { git } from '@repo/git';",
  ],
  invalid: [
    {
      code: "import { spawn } from 'node:child_process';",
      errors: childProcess,
    },
    { code: "import { spawn } from 'child_process';", errors: childProcess },
    { code: "await import('node:child_process');", errors: childProcess },
  ],
});

ruleTester.run('machine-clock', machineClock, {
  valid: ['const startedAt = input.now();', 'const id = input.createId();'],
  invalid: [
    { code: 'const startedAt = Date.now();', errors: clock },
    { code: 'const id = randomUUID();', errors: clock },
    { code: "import { randomUUID } from 'node:crypto';", errors: clock },
  ],
});
