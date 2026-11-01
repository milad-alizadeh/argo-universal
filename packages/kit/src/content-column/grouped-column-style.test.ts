import { describe, expect, it } from 'vitest';
import { fieldGroupColumnStyle } from './grouped-column-style';

describe('fieldGroupColumnStyle', () => {
  it('leaves a group with no column to fill its pane', () => {
    expect(fieldGroupColumnStyle()).toEqual({});
  });

  it('caps and centres the group, less the padding Expo adds itself', () => {
    expect(
      fieldGroupColumnStyle({
        maxWidth: 848,
        paddingLeft: 24,
        paddingRight: 24,
      }),
    ).toEqual({
      width: '100%',
      maxWidth: 848,
      alignSelf: 'center',
      paddingLeft: 8,
      paddingRight: 8,
    });
  });

  it('never gives a negative padding', () => {
    const style = fieldGroupColumnStyle({ paddingLeft: 4, paddingRight: 0 });

    expect([style.paddingLeft, style.paddingRight]).toEqual([0, 0]);
  });
});
