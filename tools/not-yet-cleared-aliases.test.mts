import { expect, it } from 'vitest';
import { evaluateWaivers } from './not-yet-cleared/evaluate.mts';

const oldFolder = 'apps/server/src/engine/*';
const engineFolder = 'packages/engine/src/engine/*';
const oldAppMocksFolder = 'packages/api/mocks/*';
const appMocksFolder = 'mocks/app/*';
const complexityCode = 'eslint(complexity)';
const waiver = (glob: string): string =>
  JSON.stringify({
    overrides: [{ files: [glob], rules: { complexity: 'off' } }],
  });
const report = JSON.stringify({
  diagnostics: [
    {
      filename: 'packages/engine/src/engine/example.ts',
      code: complexityCode,
    },
  ],
});

it.each([
  [oldFolder, engineFolder],
  [oldAppMocksFolder, appMocksFolder],
])(
  'retains the historical waiver identity from %s to %s',
  (old, moved): void => {
    expect(
      evaluateWaivers({
        current: waiver(moved),
        baseline: waiver(old),
        report: JSON.stringify({
          diagnostics: [
            {
              filename: moved.replace('*', 'example.ts'),
              code: complexityCode,
            },
          ],
        }),
      }).problems,
    ).toEqual([]);
  },
);

it.each([
  ['mocks', 'apps/server/mocks'],
  ['src/engine', 'apps/server/src/engine'],
  ...['agents', 'blob', 'feed', 'projects', 'sessions', 'system'].flatMap(
    (module): [string, string][] => [
      [`src/${module}`, `apps/server/src/services/${module}`],
      [`src/${module}`, `packages/engine/src/services/${module}`],
    ],
  ),
  ['src/sessions/list', 'packages/engine/src/services/sessions'],
  ['src/storage', 'packages/engine/src/services/feed'],
])(
  'accepts only the approved relocation of %s from %s',
  (folder, old): void => {
    const glob = `packages/engine/${folder}/*`;
    const measured = JSON.stringify({
      diagnostics: [
        {
          filename: `packages/engine/${folder}/example.ts`,
          code: complexityCode,
        },
      ],
    });
    expect(
      evaluateWaivers({
        current: waiver(glob),
        baseline: waiver(`${old}/*`),
        report: measured,
      }).problems,
    ).toEqual([]);
  },
);

it.each([
  [oldFolder, engineFolder],
  [engineFolder, oldFolder],
  [oldAppMocksFolder, appMocksFolder],
  [appMocksFolder, oldAppMocksFolder],
])(
  'rejects both historical aliases together: %s, %s',
  (first, second): void => {
    const current = JSON.stringify({
      overrides: [first, second].map((glob) => ({
        files: [glob],
        rules: { complexity: 'off' },
      })),
    });
    expect(
      evaluateWaivers({ current, baseline: waiver(oldFolder), report })
        .problems,
    ).toContain(`${second}: duplicate historical waiver identity`);
  },
);

it.each([
  'packages/engine/src/engine/**',
  'packages/engine/src/supervisor/*',
  'mocks/app/**',
  'mocks/app/nested/*',
  'mocks/*',
])('rejects an unlisted relocation glob: %s', (glob): void => {
  expect(
    evaluateWaivers({
      current: waiver(glob),
      baseline: waiver(oldFolder),
      report,
    }).problems,
  ).toContain(`${glob}: added entry or changed glob`);
});

it.each([
  [oldFolder, engineFolder],
  [oldAppMocksFolder, appMocksFolder],
])('rejects a rule added while relocating %s to %s', (old, moved): void => {
  const current = JSON.stringify({
    overrides: [
      {
        files: [moved],
        rules: { complexity: 'off', 'max-depth': 'off' },
      },
    ],
  });
  expect(
    evaluateWaivers({ current, baseline: waiver(old), report }).problems,
  ).toContain(`${moved}: added rule max-depth`);
});

it('still prunes a relocated rule with no findings', (): void => {
  const result = evaluateWaivers({
    current: waiver(engineFolder),
    baseline: waiver(oldFolder),
    report: '{"diagnostics":[]}',
  });
  expect(result.problems).toContain(
    `${engineFolder}: stale rule complexity; run node tools/not-yet-cleared.mts prune`,
  );
  expect(JSON.parse(result.pruned)).toEqual({ overrides: [] });
});
