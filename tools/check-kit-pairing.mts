import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pluginPartSchemas } from '@repo/contracts/plugins/kit-prop-descriptors';
import { pairingProblems, type SchemaEntry } from './kit-pairing-rules.mts';

const root = fileURLToPath(new URL('..', import.meta.url));

const primitives = 'packages/kit/src/primitives/';

const schemas: SchemaEntry[] = Object.entries(pluginPartSchemas).map(
  ([name, { group }]): SchemaEntry => ({ name, group }),
);

// A drawing folder is `<group>/<folder>/` holding at least one tracked file.
const folders = [
  ...new Set(
    execFileSync(
      'git',
      [
        'ls-files',
        '--cached',
        '--others',
        '--exclude-standard',
        '--',
        primitives,
      ],
      {
        cwd: root,
        encoding: 'utf8',
      },
    )
      .split('\n')
      .filter((file): boolean => file !== '' && existsSync(resolve(root, file)))
      .map((file): string[] => file.slice(primitives.length).split('/'))
      .filter((parts): boolean => parts.length > 2)
      .map((parts): string => parts.slice(0, 2).join('/')),
  ),
];

const problems = pairingProblems({ schemas, folders });

for (const problem of problems) console.error(problem);

console.log(
  `check-kit-pairing: ${schemas.length} schemas, ${folders.length} folders, ${problems.length} problems`,
);

process.exit(problems.length > 0 ? 1 : 0);
