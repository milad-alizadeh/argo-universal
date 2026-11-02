import { describe, expect, it } from 'vitest';
import { seenLabel } from './device-rows';

const now = Date.parse('2026-10-21T12:00:00Z');

describe("a Device's last seen", () => {
  it('reads active now for a Device that spoke a moment ago', () => {
    expect(seenLabel('2026-10-21T11:58:00Z', now)).toBe('Active now');
  });

  it('names the day for a Device that has been quiet', () => {
    expect(seenLabel('2026-10-12T09:00:00Z', now)).toBe('Last seen 12 Oct');
  });

  it('says so for a Device that never connected after pairing', () => {
    expect(seenLabel(null, now)).toBe('Never seen');
  });
});
