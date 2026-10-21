import { describe, expect, it } from 'vitest';
import { sourceTree } from './source-tree.mts';
import { branchesIn } from './story-branches.mts';

const branches = (source: string): string[] =>
  branchesIn([sourceTree(source)]).map(
    (branch): string => `${branch.prop}=${branch.value}`,
  );

describe('a component writes its branch set down', (): void => {
  it('reads a variants map', (): void => {
    const source = `const classes = cva('base', {
      variants: { variant: { outline: 'a', ghost: 'b' }, disabled: { true: 'c' } },
    });`;

    expect(branches(source)).toStrictEqual([
      'variant=outline',
      'variant=ghost',
      'disabled=true',
    ]);
  });

  it('reads a table the prop indexes', (): void => {
    const source = `const fills = { muted: 'a', danger: 'b' } satisfies Record<Tone, string>;
      const fill = (tone: Tone): string => fills[tone ?? 'muted'];`;

    expect(branches(source)).toContain('tone=muted');
    expect(branches(source)).toContain('tone=danger');
  });

  it('reads a literal comparison and a truth read', (): void => {
    const source = `const look = (props: P): string =>
      props.tone === 'danger' ? 'red' : props.loading ? 'spin' : '';`;

    expect(branches(source)).toContain('tone=danger');
    expect(branches(source)).toContain('loading=true');
  });

  it('reads nothing from a prop the component only passes through', (): void => {
    const source = `const Label = (props: P) => <Text>{props.label}</Text>;`;

    expect(branches(source)).toStrictEqual([]);
  });
});
