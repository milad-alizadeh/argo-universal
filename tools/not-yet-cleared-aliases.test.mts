import { expect, it } from 'vitest';
import { evaluateWaivers } from './not-yet-cleared/evaluate.mts';

const oldFolder = 'apps/server/src/engine/*';
const engineFolder = 'packages/engine/src/engine/*';
const waiver = (glob: string): string =>
  JSON.stringify({
    overrides: [{ files: [glob], rules: { complexity: 'off' } }],
  });
const report = JSON.stringify({
  diagnostics: [
    {
      filename: 'packages/engine/src/engine/example.ts',
      code: 'eslint(complexity)',
    },
  ],
});

it('retains the historical Engine waiver identity after extraction', (): void => {
  expect(
    evaluateWaivers({
      current: waiver(engineFolder),
      baseline: waiver(oldFolder),
      report,
    }).problems,
  ).toEqual([]);
});

it.each([
  'mocks',
  'src/engine',
  'src/services',
  'src/services/agents',
  'src/services/blob',
  'src/services/feed',
  'src/services/projects',
  'src/services/sessions',
  'src/services/system',
])('accepts only the approved relocation of %s', (folder): void => {
  const glob = `packages/engine/${folder}/*`;
  const measured = JSON.stringify({
    diagnostics: [
      {
        filename: `packages/engine/${folder}/example.ts`,
        code: 'eslint(complexity)',
      },
    ],
  });
  expect(
    evaluateWaivers({
      current: waiver(glob),
      baseline: waiver(`apps/server/${folder}/*`),
      report: measured,
    }).problems,
  ).toEqual([]);
});

it.each([
  [oldFolder, engineFolder],
  [engineFolder, oldFolder],
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

it.each(['packages/engine/src/engine/**', 'packages/engine/src/supervisor/*'])(
  'rejects an unlisted Engine glob: %s',
  (glob): void => {
    expect(
      evaluateWaivers({
        current: waiver(glob),
        baseline: waiver(oldFolder),
        report,
      }).problems,
    ).toContain(`${glob}: added entry or changed glob`);
  },
);

it('rejects a rule added during relocation', (): void => {
  const current = JSON.stringify({
    overrides: [
      {
        files: [engineFolder],
        rules: { complexity: 'off', 'max-depth': 'off' },
      },
    ],
  });
  expect(
    evaluateWaivers({ current, baseline: waiver(oldFolder), report }).problems,
  ).toContain(`${engineFolder}: added rule max-depth`);
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
