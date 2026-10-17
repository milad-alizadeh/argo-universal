import { describe, expect, it } from 'vitest';
import {
  type ForegroundSignals,
  isNotificationForeground,
} from './use-foreground.web';

describe('isNotificationForeground', () => {
  it.each<[string, boolean, ForegroundSignals]>([
    [
      'a visible, focused window',
      true,
      { visible: true, focused: true, minimized: false },
    ],
    [
      'a hidden window',
      false,
      { visible: false, focused: false, minimized: false },
    ],
    [
      'an unfocused window',
      false,
      { visible: true, focused: false, minimized: false },
    ],
    // Linux reports a minimized Electron window to the page as visible and focused.
    [
      'a minimized window the page sees as visible and focused',
      false,
      { visible: true, focused: true, minimized: true },
    ],
  ])('%s is foreground: %s', (_name, foreground, signals) => {
    expect(isNotificationForeground(signals)).toBe(foreground);
  });
});
