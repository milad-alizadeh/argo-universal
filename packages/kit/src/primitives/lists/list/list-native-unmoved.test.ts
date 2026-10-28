import { describe, expect, it } from 'vitest';
import { rowId } from './list-move-model';
import type { NativeSection } from './list-native-sections';
import { missesIds } from './list-native-unmoved';

const drawn = (): never => {
  throw new Error('Not drawn');
};

const sectionOf = (ids: (string | undefined)[]): NativeSection[] => [
  {
    key: 'first',
    rows: ids.map((id, index) => ({
      key: String(index),
      id: id === undefined ? undefined : rowId(id),
      render: drawn,
    })),
  },
];

describe('missesIds', () => {
  it('is true when a row has no id', () => {
    expect(missesIds(sectionOf(['alpha', undefined]))).toBe(true);
  });

  it('is false when every row has an id', () => {
    expect(missesIds(sectionOf(['alpha', 'beta']))).toBe(false);
  });
});
