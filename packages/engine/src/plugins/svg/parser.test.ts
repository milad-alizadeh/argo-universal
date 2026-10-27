import { describe, expect, it } from 'vitest';
import { parseSvg } from './parser';

describe('parseSvg', () => {
  it('reads elements, camel-cased attributes and text', () => {
    expect(
      parseSvg(
        '<?xml version="1.0"?><svg viewBox="0 0 1 1" stroke-width=2><!-- c --><text>a <![CDATA[ b ]]></text><path d=\'M0 0\'/></svg>',
      ),
    ).toEqual({
      tag: 'svg',
      props: { viewBox: '0 0 1 1', strokeWidth: '2' },
      children: [
        { tag: 'text', props: {}, children: ['a ', ' b '] },
        { tag: 'path', props: { d: 'M0 0' }, children: [] },
      ],
    });
  });

  it('reads a numeric value as the number it spells, except an id', () => {
    expect(parseSvg('<svg width="1e3" height=" 5 " id="1e3"/>')?.props).toEqual(
      {
        width: '1000',
        height: '5',
        id: '1e3',
      },
    );
  });

  it('returns null for text with no element', () => {
    expect(parseSvg('no markup here')).toBeNull();
  });

  it.each([
    ['<svg><g></svg>', 'Expected closing tag </svg> to match its opening tag'],
    ['<svg><g a="1"b="2"/></svg>', 'Expected >'],
    ['<svg></svg x>', 'Expected >'],
  ])('throws on malformed markup %s', (xml, message) => {
    expect(() => parseSvg(xml)).toThrow(message);
  });
});
