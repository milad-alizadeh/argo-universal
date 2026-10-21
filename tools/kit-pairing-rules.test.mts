import { describe, expect, it } from 'vitest';
import { pairingProblems } from './kit-pairing-rules.mts';

const actions = 'actions';

const buttonFolder = 'actions/button';

const button = { name: 'Button', group: actions };

describe('pairingProblems', () => {
  it('accepts a schema and a drawing in the same group', () => {
    expect(
      pairingProblems({ schemas: [button], folders: [buttonFolder] }),
    ).toEqual([]);
  });

  it('names a schema with no drawing', () => {
    const [problem, ...rest] = pairingProblems({
      schemas: [button, { name: 'IconButton', group: actions }],
      folders: [buttonFolder],
    });

    expect(rest).toEqual([]);
    expect(problem).toContain('IconButton');
    expect(problem).toContain('actions/icon-button');
  });

  it('names a drawing with no schema', () => {
    const [problem, ...rest] = pairingProblems({
      schemas: [button],
      folders: [buttonFolder, 'actions/chip'],
    });

    expect(rest).toEqual([]);
    expect(problem).toContain('packages/kit/src/primitives/actions/chip');
  });

  it('reports a drawing in another group than its schema', () => {
    const [problem, ...rest] = pairingProblems({
      schemas: [{ name: 'Form', group: 'forms' }],
      folders: ['fields/form'],
    });

    expect(rest).toEqual([]);
    expect(problem).toContain('parts/forms.ts');
    expect(problem).toContain('fields/form');
  });

  it('skips the group of a part declared outside the group files', () => {
    expect(
      pairingProblems({
        schemas: [{ name: 'Canvas', group: undefined }],
        folders: ['visual/canvas'],
      }),
    ).toEqual([]);
  });

  it('leaves exempt folders alone', () => {
    expect(
      pairingProblems({
        schemas: [],
        folders: ['native/host', 'kit-props/index', 'actions/pressable'],
      }),
    ).toEqual([]);
  });

  it('leaves an exempt schema without a drawing alone', () => {
    expect(
      pairingProblems({
        schemas: [{ name: 'Action', group: actions }],
        folders: [],
      }),
    ).toEqual([]);
  });

  it('draws a compound name in its parent folder', () => {
    expect(
      pairingProblems({
        schemas: [
          { name: 'List', group: 'lists' },
          { name: 'List.Section', group: 'lists' },
        ],
        folders: ['lists/list'],
      }),
    ).toEqual([]);
  });

  it('asks for the parent folder of a compound name', () => {
    const problems = pairingProblems({
      schemas: [{ name: 'Metadata.Avatar', group: undefined }],
      folders: [],
    });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('Metadata ');
  });
});
