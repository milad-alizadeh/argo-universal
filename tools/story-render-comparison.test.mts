import { describe, expect, it } from 'vitest';
import {
  duplicateRenderProblems,
  maskPath,
  type RenderNode,
  type StoryRender,
} from './story-render-rules.mts';

const node = (tag: string, children: RenderNode[] = []): RenderNode => ({
  tag,
  attributes: '',
  text: '',
  children,
});

const leaf = (tag: string, text: string): RenderNode => ({
  tag,
  attributes: '',
  text,
  children: [],
});

const render = (
  story: string,
  domHash: string,
  pixelHash: string,
): StoryRender => ({
  file: 'packages/kit/src/primitives/actions/button/button.stories.tsx',
  story,
  domHash,
  pixelHash,
});

describe('duplicateRenderProblems', () => {
  it('passes stories that differ on screen', () => {
    expect(
      duplicateRenderProblems([
        render('Default', 'a', 'one'),
        render('Destructive', 'b', 'two'),
      ]),
    ).toEqual([]);
  });

  it('passes stories whose DOM matches but whose pixels do not', () => {
    expect(
      duplicateRenderProblems([
        render('Default', 'a', 'one'),
        render('Hovered', 'a', 'two'),
      ]),
    ).toEqual([]);
  });

  it('names both stories when the DOM and the pixels match', () => {
    const [problem] = duplicateRenderProblems([
      render('Default', 'a', 'one'),
      render('Normal', 'a', 'one'),
    ]);

    expect(problem).toContain('Normal draws what Default already draws');
    expect(problem).toContain('ADR-0040 decision 4');
  });

  it('keeps two files apart', () => {
    expect(
      duplicateRenderProblems([
        render('Default', 'a', 'one'),
        { ...render('Default', 'a', 'one'), file: 'other.stories.tsx' },
      ]),
    ).toEqual([]);
  });
});

describe('maskPath', () => {
  it('reports no difference between equal trees', () => {
    expect(
      maskPath(node('div', [leaf('p', 'hi')]), node('div', [leaf('p', 'hi')])),
    ).toBeUndefined();
  });

  it('walks down to the single box that differs', () => {
    const left = node('div', [
      leaf('p', 'same'),
      node('aside', [leaf('b', 'running')]),
    ]);

    const right = node('div', [
      leaf('p', 'same'),
      node('aside', [leaf('b', 'failing')]),
    ]);

    expect(maskPath(left, right)).toEqual([1, 0]);
  });

  it('stops at the root when two boxes differ', () => {
    const left = node('div', [leaf('p', 'one'), leaf('b', 'running')]);

    const right = node('div', [leaf('p', 'two'), leaf('b', 'failing')]);

    expect(maskPath(left, right)).toEqual([]);
  });

  it('stops at the root when a box is only in one render', () => {
    expect(maskPath(node('div', [leaf('p', 'a')]), node('div'))).toEqual([]);
  });
});
