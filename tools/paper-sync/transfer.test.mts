import { describe, expect, it } from 'vitest';
import { pair } from './fixtures.mts';
import { required } from './model.mts';
import { svgFromJsx } from './svg.mts';
import { checkTokens } from './tokens.mts';

const inkToken = '--color-ink';

describe('token transfer', () => {
  it('checks aliased token values across files', () => {
    const { master } = pair();
    required(master.nodes[0]).styles = { color: 'var(--color-primary)' };
    expect(() =>
      checkTokens(
        master,
        new Map([
          ['--color-primary', 'var(--color-ink)'],
          [inkToken, 'black'],
        ]),
        new Map([
          ['--color-primary', 'var(--color-ink)'],
          [inkToken, 'red'],
        ]),
      ),
    ).toThrow(inkToken);
  });
});

describe('static SVG transfer', () => {
  it('preserves token references without carrying Paper node IDs', () => {
    expect(
      svgFromJsx(
        '(<svg id="old" viewBox="0 0 16 16"><path stroke="var(--color-primary)" strokeWidth="2" /></svg>)',
      ),
    ).toBe(
      '<svg viewBox="0 0 16 16"><path stroke="var(--color-primary)" stroke-width="2"></path></svg>',
    );
  });
  it.each([
    '(<svg onLoad="run()"/>)',
    '(<svg width={run()}/>)',
    '(<svg><script /></svg>)',
  ])('rejects executable SVG input %s', (jsx) => {
    expect(() => svgFromJsx(jsx)).toThrow(/SVG|JSX/);
  });
});
