import { describe, expect, it } from 'vitest';
import {
  type ContentRule,
  contentSpan,
  isContentWide,
  placedContentWide,
} from './content-rule';

const rule: ContentRule = {
  wideMin: 480,
  maximum: 800,
  gutter: 24,
  phoneGutter: 16,
};

describe('content rule', () => {
  it('draws wide from the threshold up', () => {
    expect(isContentWide(479, rule)).toBe(false);
    expect(isContentWide(480, rule)).toBe(true);
  });

  it('centres the column in a page wider than it can be', () => {
    expect(contentSpan({ offset: 100, width: 1200 }, rule)).toEqual({
      offset: 276,
      width: 848,
    });
  });

  it('fills a page narrower than the column', () => {
    expect(contentSpan({ offset: 100, width: 600 }, rule)).toEqual({
      offset: 100,
      width: 600,
    });
  });

  it('keeps what a hidden page drew last', () => {
    expect(placedContentWide(0, rule, true)).toBe(true);
    expect(placedContentWide(0, rule)).toBeUndefined();
    expect(placedContentWide(300, rule, true)).toBe(false);
  });
});
