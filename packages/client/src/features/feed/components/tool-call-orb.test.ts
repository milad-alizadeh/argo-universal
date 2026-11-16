import { describe, expect, it } from 'vitest';
import { call } from '../view/feed-row-facts.mocks';
import { toolCallOrb } from './tool-call-orb';

describe('toolCallOrb', () => {
  it.each([
    { kind: 'read', orb: 'searching' },
    { kind: 'search', orb: 'searching' },
    { kind: 'fetch', orb: 'searching' },
    { kind: 'edit', orb: 'composing' },
    { kind: 'delete', orb: 'composing' },
    { kind: 'move', orb: 'composing' },
    { kind: 'execute', orb: 'shaping' },
    { kind: 'think', orb: 'working' },
    { kind: 'other', orb: 'working' },
  ] as const)('moves a $kind call as $orb', ({ kind, orb }) => {
    expect(toolCallOrb(call({ kind }))).toBe(orb);
  });

  it('moves as working without a Tool call', () => {
    expect(toolCallOrb()).toBe('working');
  });
});
