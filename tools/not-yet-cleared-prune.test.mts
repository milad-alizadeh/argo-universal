import { expect, it } from 'vitest';
import {
  commented,
  complexityCode,
  current,
  depthCode,
  exampleFilename,
  folder,
  report,
} from './not-yet-cleared.mocks.mts';
import { evaluateWaivers } from './not-yet-cleared/evaluate.mts';

it('prunes an entry already left empty', (): void => {
  const text =
    '{"overrides":[{"files":["packages/example/src/*"],"rules":{}}]}';
  expect(
    evaluateWaivers({ current: text, baseline: current, report }).pruned,
  ).toBe('{"overrides":[]}');
});

it('reports a stale rule and prunes its empty entry', (): void => {
  expect(
    evaluateWaivers({
      current,
      baseline: current,
      report: '{"diagnostics":[]}',
    }),
  ).toEqual({
    problems: [
      `${folder}: stale rule complexity; run node tools/not-yet-cleared.mts prune`,
    ],
    entries: [{ glob: folder, findings: 0, rules: 1 }],
    pruned: '{"overrides":[]}',
  });
});
it.each([
  {
    filename: 'packages/other/example.ts',
    code: depthCode,
    absent: '// complexity',
    present: '// max-depth',
  },
  {
    filename: exampleFilename,
    code: complexityCode,
    absent: '// max-depth',
    present: '// complexity',
  },
])('removes an empty entry with its comment: $absent', (finding): void => {
  const measured = JSON.stringify({ diagnostics: [finding] });
  const result = evaluateWaivers({
    current: commented,
    baseline: commented,
    report: measured,
  });
  expect(result.pruned).not.toContain(finding.absent);
  expect(result.pruned).toContain(finding.present);
  expect(
    evaluateWaivers({
      current: result.pruned,
      baseline: commented,
      report: measured,
    }).problems,
  ).toEqual([]);
});

it('preserves comments and bytes when all waivers have findings', (): void => {
  const measured = JSON.stringify({
    diagnostics: [
      {
        filename: exampleFilename,
        code: complexityCode,
      },
      { filename: 'packages/other/example.ts', code: depthCode },
    ],
  });
  expect(
    evaluateWaivers({
      current: commented,
      baseline: commented,
      report: measured,
    }).pruned,
  ).toBe(commented);
});

it('prunes only the stale rule in an entry', (): void => {
  const text =
    '{"overrides":[{"files":["packages/example/src/*"],"rules":{"complexity":"off", "max-depth":"off"}}]}';
  const result = evaluateWaivers({ current: text, baseline: text, report });
  expect(result.pruned).toBe(current);
});

it('keeps the spacing when pruning the first rule', (): void => {
  const text =
    '{ "overrides": [{ "files": ["packages/example/src/*"], "rules": { "complexity": "off", "max-depth": "off" } }] }';
  const measured = JSON.stringify({
    diagnostics: [{ filename: exampleFilename, code: depthCode }],
  });
  expect(
    evaluateWaivers({ current: text, baseline: text, report: measured }).pruned,
  ).toBe(
    '{ "overrides": [{ "files": ["packages/example/src/*"], "rules": { "max-depth": "off" } }] }',
  );
});
