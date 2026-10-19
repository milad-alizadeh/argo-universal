import { describe, expect, it } from 'vitest';
import {
  type Diagnostic,
  formatFinding,
  unwaivedFindings,
} from './unwaived-findings.mts';

const notYetCleared = JSON.stringify({
  overrides: [
    { files: ['packages/example/src/*'], rules: { complexity: 'off' } },
  ],
});

const styled = 'packages/client/src/feed/row.tsx';

const sources = {
  notYetCleared,
  allowlists: [
    {
      text: JSON.stringify({
        overrides: [{ files: [styled], rules: { 'argo/kit-styling': 'off' } }],
      }),
      rule: 'argo/kit-styling',
    },
  ],
};

const complexity = 'eslint(complexity)';

const finding = (filename: string, code: string): Diagnostic => ({
  filename,
  code,
  message: 'Too complex.',
  severity: 'error',
  labels: [{ span: { line: 3, column: 7 } }],
});

const report = (...diagnostics: Diagnostic[]): string =>
  JSON.stringify({ diagnostics });

describe('the findings outside the waivers', (): void => {
  it('drops a waived rule in a file directly inside a waived folder', (): void => {
    const waived = finding('packages/example/src/a.ts', complexity);

    expect(unwaivedFindings(report(waived), sources)).toEqual([]);
  });

  it('keeps a waived rule in a nested folder', (): void => {
    const nested = finding('packages/example/src/deep/a.ts', complexity);

    expect(unwaivedFindings(report(nested), sources)).toHaveLength(1);
  });

  it('keeps another rule in a waived folder', (): void => {
    const other = finding('packages/example/src/a.ts', 'eslint(max-depth)');

    expect(unwaivedFindings(report(other), sources)).toHaveLength(1);
  });

  it('drops an allowlisted rule only in an allowlisted file', (): void => {
    const listed = finding(styled, 'argo(kit-styling)');

    const unlisted = finding(
      'packages/client/src/feed/card.tsx',
      'argo(kit-styling)',
    );

    expect(
      unwaivedFindings(report(listed, unlisted), sources).map(
        (diagnostic): string => diagnostic.filename,
      ),
    ).toEqual(['packages/client/src/feed/card.tsx']);
  });

  it('prints the file, position, rule and message', (): void => {
    const [kept] = unwaivedFindings(
      report(finding('apps/a.ts', complexity)),
      sources,
    );

    expect(kept && formatFinding(kept)).toBe(
      'apps/a.ts:3:7: error eslint(complexity): Too complex.',
    );
  });
});
