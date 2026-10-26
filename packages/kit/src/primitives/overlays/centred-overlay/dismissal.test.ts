import { describe, expect, it } from 'vitest';
import { dismissesOnBackdropPress, mayDismiss } from './dismissal';

interface Overrides {
  target?: string;
  prevented?: boolean;
}

interface Press {
  target: string;
  currentTarget: string;
  isDefaultPrevented: () => boolean;
}

const press = (overrides: Overrides = {}): Press => ({
  target: overrides.target ?? 'backdrop',
  currentTarget: 'backdrop',
  isDefaultPrevented: (): boolean => overrides.prevented ?? false,
});

describe('mayDismiss', () => {
  it('lets a modal be dismissed unless it says otherwise', () => {
    expect(mayDismiss(true)).toBe(true);
    expect(mayDismiss(false)).toBe(false);
  });
});

describe('dismissesOnBackdropPress', () => {
  it('closes on a press on the bare backdrop', () => {
    expect(dismissesOnBackdropPress(press(), true)).toBe(true);
  });

  it('ignores a press that began inside the card', () => {
    expect(dismissesOnBackdropPress(press({ target: 'card' }), true)).toBe(
      false,
    );
  });

  it('ignores a press whose default was prevented', () => {
    expect(dismissesOnBackdropPress(press({ prevented: true }), true)).toBe(
      false,
    );
  });

  it('keeps a modal open that is not dismissible', () => {
    expect(dismissesOnBackdropPress(press(), false)).toBe(false);
  });
});
