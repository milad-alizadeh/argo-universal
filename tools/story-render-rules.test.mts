import { describe, expect, it } from 'vitest';
import {
  type ChildStatePair,
  childStateProblems,
  fixturePairs,
} from './story-render-rules.mts';

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
