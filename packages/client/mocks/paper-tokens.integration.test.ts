import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { findPaperTokenDrift } from '@repo/uniwind/paper-token-drift';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const read = (specifier: string): string =>
  readFileSync(require.resolve(specifier), 'utf8');

const theme = read('@repo/uniwind/theme.css');
const roles = ['title', 'heading', 'body', 'secondary'] as const;

describe('Paper and the app share one set of tokens', () => {
  it('defines every Paper token in theme.css with the same value', () => {
    const drift = findPaperTokenDrift({
      tailwindDefaults: read('tailwindcss/theme.css'),
      theme,
      paper: read('@repo/uniwind/paper-tokens.css'),
    });

    expect(drift).toEqual([]);
  });

  it.each(roles)('builds type-%s from its role tokens alone', (role) => {
    const utility = theme.slice(theme.indexOf(`@utility type-${role} {`));
    const body = utility.slice(0, utility.indexOf('\n}\n'));

    expect(body.match(/(?:font-size|line-height|font-weight): [^;]+/g)).toEqual(
      expect.arrayContaining([
        `font-size: var(--text-${role})`,
        `line-height: var(--leading-${role})`,
        `font-weight: var(--font-weight-${role})`,
      ]),
    );
  });
});
