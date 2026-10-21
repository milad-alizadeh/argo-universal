import { describe, expect, it } from 'vitest';
import type { Branch } from './story-branches.mts';
import { storyDraft } from './story-draft.mts';
import type { PropDomain } from './story-props.mts';

const prop = (
  name: string,
  values: string[],
  acceptsBoolean = false,
): PropDomain => ({
  name,
  values,
  acceptsBoolean,
  kind: values.length > 0 ? 'choice' : 'text',
  required: false,
});

const label: PropDomain = { ...prop('label', []), required: true };

const draft = (
  props: PropDomain[],
  branches: Branch[],
): ReturnType<typeof storyDraft> =>
  storyDraft({
    title: 'Design System/Primitives/Actions/Button',
    component: 'Button',
    kitPart: 'Button',
    props,
    branches,
  });

const names = (props: PropDomain[], branches: Branch[]): string[] =>
  draft(props, branches).stories.map((plan): string => plan.name);

describe('a prop value earns a story when the component branches on it', (): void => {
  it('names an enum story for the value and a boolean story for the prop', (): void => {
    const props = [prop('variant', ['ghost']), prop('loading', [], true)];

    expect(
      names(props, [
        { prop: 'variant', value: 'ghost' },
        { prop: 'loading', value: 'true' },
      ]),
    ).toStrictEqual(['Ghost', 'Loading']);
  });

  it('drops a branch on a value the prop does not declare', (): void => {
    expect(
      names(
        [prop('variant', ['ghost'])],
        [{ prop: 'variant', value: 'control' }],
      ),
    ).toStrictEqual([]);
  });

  it('drops a branch on a prop the component does not declare', (): void => {
    expect(names([label], [{ prop: 'role', value: 'badge' }])).toStrictEqual(
      [],
    );
  });

  it('seeds a required prop with no branch as an arg, never a story', (): void => {
    const made = draft([label], []);

    expect(made.args).toStrictEqual([{ name: 'label', literal: "'Label'" }]);
    expect(made.stories).toStrictEqual([]);
  });

  it('keeps two branches that would share a name apart', (): void => {
    const props = [prop('variant', ['link']), prop('icon', ['link'])];

    expect(
      names(props, [
        { prop: 'variant', value: 'link' },
        { prop: 'icon', value: 'link' },
      ]),
    ).toStrictEqual(['Link', 'LinkIcon']);
  });
});
