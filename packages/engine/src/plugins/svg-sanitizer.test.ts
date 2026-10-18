import fixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { parseSvg } from './svg-parser';
import {
  sanitizeSvg,
  svgCharacterLimit,
  svgDepthLimit,
  svgElementLimit,
} from './svg-sanitizer';

describe('sanitizeSvg', () => {
  it.each(fixtures.valid)('accepts and canonicalizes $name', ({ xml }) => {
    const result = sanitizeSvg(xml, parseSvg);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(parseSvg(result.xml)).toEqual(parseSvg(xml));
  });

  it.each(fixtures.refused)('refuses $name', ({ xml }) => {
    expect(sanitizeSvg(xml, parseSvg).ok).toBe(false);
  });

  it('accepts the character, element and depth limits at their boundaries', () => {
    const characterBase = '<svg/>';
    const atCharacterLimit = `${characterBase}<!--${'x'.repeat(
      svgCharacterLimit - characterBase.length - 7,
    )}-->`;
    const atElementLimit = `<svg>${'<g/>'.repeat(svgElementLimit - 1)}</svg>`;
    const atDepthLimit = `<svg>${'<g>'.repeat(svgDepthLimit - 1)}${'</g>'.repeat(
      svgDepthLimit - 1,
    )}</svg>`;

    expect(atCharacterLimit).toHaveLength(svgCharacterLimit);
    expect(sanitizeSvg(atCharacterLimit, parseSvg).ok).toBe(true);
    expect(sanitizeSvg(atElementLimit, parseSvg).ok).toBe(true);
    expect(sanitizeSvg(atDepthLimit, parseSvg).ok).toBe(true);
  });

  it('refuses one item beyond each structural limit', () => {
    const tooManyElements = `<svg>${'<g/>'.repeat(svgElementLimit)}</svg>`;
    const tooDeep = `<svg>${'<g>'.repeat(svgDepthLimit)}${'</g>'.repeat(
      svgDepthLimit,
    )}</svg>`;

    expect(
      sanitizeSvg(`<svg/>${' '.repeat(svgCharacterLimit)}`, parseSvg).ok,
    ).toBe(false);
    expect(sanitizeSvg(tooManyElements, parseSvg).ok).toBe(false);
    expect(sanitizeSvg(tooDeep, parseSvg).ok).toBe(false);
  });

  it('refuses non-finite values in SVG paths and transforms', () => {
    expect(sanitizeSvg('<svg><path d="M0 Infinity"/></svg>', parseSvg).ok).toBe(
      false,
    );
    expect(
      sanitizeSvg(
        '<svg><path transform="translate(Infinity)"/></svg>',
        parseSvg,
      ).ok,
    ).toBe(false);
  });

  it('keeps canonical output under the character cap when CDATA needs splitting', () => {
    const text = ']]>'.repeat(12_000);
    const xml = `<svg><text>${text}</text></svg>`;

    expect(xml.length).toBeLessThan(svgCharacterLimit);
    expect(sanitizeSvg(xml, parseSvg).ok).toBe(false);
  });
});
