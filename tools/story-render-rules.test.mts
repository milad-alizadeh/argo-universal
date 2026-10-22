import { describe, expect, it } from 'vitest';
import {
  type ChildStatePair,
  childStateProblems,
  duplicateRenderProblems,
  fixturePairs,
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

const detailView =
  'packages/client/src/screens/sessions/$id/session-detail-view.stories.tsx';

const storiesFile = 'session-detail-view.stories.tsx';

const pair = (overrides: Partial<ChildStatePair> = {}): ChildStatePair => ({
  file: detailView,
  first: 'ChecksRunning',
  second: 'ChecksFailing',
  fixture: 'pullRequestMocks',
  maskedDomHashesMatch: true,
  maskedPixelHashesMatch: true,
  maskDepth: 7,
  maskedNodes: 20,
  totalNodes: 400,
  ...overrides,
});

describe('childStateProblems', () => {
  it('fails a pair that draws the same page outside the child', () => {
    const [problem] = childStateProblems([pair()]);

    expect(problem).toContain('ChecksRunning and ChecksFailing');
    expect(problem).toContain('ADR-0040 decision 5');
  });

  it('passes a pair whose one box is most of the page', () => {
    expect(childStateProblems([pair({ maskedNodes: 300 })])).toEqual([]);
  });

  it('passes a pair whose difference reaches the page root', () => {
    expect(childStateProblems([pair({ maskDepth: 0 })])).toEqual([]);
  });

  it('passes a pair that differs in pixels outside the masked box', () => {
    expect(
      childStateProblems([pair({ maskedPixelHashesMatch: false })]),
    ).toEqual([]);
  });

  it('passes a pair that differs in DOM outside the masked box', () => {
    expect(childStateProblems([pair({ maskedDomHashesMatch: false })])).toEqual(
      [],
    );
  });
});

describe('fixturePairs', () => {
  it('pairs two stories picking two members of one imported fixture', () => {
    const source = [
      "import { pullRequestMocks } from './session-detail-view-pull-request.mocks';",
      'export const ChecksRunning: Story = { args: withPullRequests(pullRequestMocks.checksRunning) };',
      'export const ChecksFailing: Story = { args: withPullRequests(pullRequestMocks.checksFailing) };',
    ].join('\n');

    expect(fixturePairs({ file: storiesFile, source })).toEqual([
      {
        file: storiesFile,
        first: 'ChecksRunning',
        second: 'ChecksFailing',
        fixture: 'pullRequestMocks',
      },
    ]);
  });

  it('pairs two stories reading two exports of one fixtures module', () => {
    const source = [
      "import { failingCheck, passingCheck } from './check-row-fixtures';",
      'export const Failing: Story = { args: { check: failingCheck } };',
      'export const Passing: Story = { args: { check: passingCheck } };',
    ].join('\n');

    const [found] = fixturePairs({ file: 'checks-card.stories.tsx', source });

    expect(found?.fixture).toBe('failingCheck and passingCheck');
  });

  it('leaves stories reading the same member alone', () => {
    const source = [
      "import { pullRequestMocks } from './session-detail-view-pull-request.mocks';",
      'export const Running: Story = { args: pullRequestMocks.checksRunning };',
      'export const Archived: Story = { args: { ...pullRequestMocks.checksRunning, archived: true } };',
    ].join('\n');

    expect(fixturePairs({ file: storiesFile, source })).toEqual([]);
  });

  it("leaves a component's own fixtures file alone", () => {
    const source = [
      "import { defaultButton, loadingButton } from './button-fixtures';",
      'const meta = { component: Button } satisfies Meta<typeof Button>;',
      'export const Default: Story = { args: defaultButton };',
      'export const Loading: Story = { args: loadingButton };',
    ].join('\n');

    expect(fixturePairs({ file: 'button.stories.tsx', source })).toEqual([]);
  });

  it('leaves an imported example component alone', () => {
    const source = [
      "import { ColorsExample, LogoExample } from './icon-examples.mocks';",
      'const meta = { component: Icon } satisfies Meta<typeof Icon>;',
      'export const Colors: Story = { render: () => <ColorsExample /> };',
      'export const Logo: Story = { render: () => <LogoExample /> };',
    ].join('\n');

    expect(fixturePairs({ file: 'icon.stories.tsx', source })).toEqual([]);
  });

  it('leaves two stories varying the parent own props alone', () => {
    const source = [
      "import { idleSession, runningSession } from './session-detail-view.mocks';",
      'export const Running: Story = { args: runningSession };',
      'export const Idle: Story = { args: idleSession };',
    ].join('\n');

    expect(fixturePairs({ file: storiesFile, source })).toEqual([]);
  });
});
