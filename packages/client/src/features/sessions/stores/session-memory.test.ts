import { describe, expect, it } from 'vitest';
import { rememberedSessions, SessionMemory } from './session-memory';

describe('what a Session remembers while the person is in another', () => {
  it('gives a Session it has not seen the initial state', () => {
    expect(new SessionMemory<string[]>([]).read('a')).toEqual([]);
  });

  it("keeps one Session's state apart from another's", () => {
    const memory = new SessionMemory<readonly string[]>([]);
    memory.write('a', ['changes']);

    expect(memory.read('a')).toEqual(['changes']);
    expect(memory.read('b')).toEqual([]);
  });

  it('applies an update to what the Session held', () => {
    const memory = new SessionMemory<number>(0);
    memory.write('a', 1);
    memory.write('a', (count) => count + 1);

    expect(memory.read('a')).toBe(2);
  });

  it('tells its readers only when something changed', () => {
    const memory = new SessionMemory<number>(0);
    let told = 0;
    memory.subscribe(() => (told += 1));
    memory.write('a', 1);
    memory.write('a', 1);

    expect(told).toBe(1);
  });

  it('forgets the Session unused the longest past its limit', () => {
    const memory = new SessionMemory<number>(0);

    for (let i = 1; i <= rememberedSessions + 1; i += 1)
      memory.write(`s${i}`, i);

    expect(memory.read('s1')).toBe(0);
    expect(memory.read(`s${rememberedSessions + 1}`)).toBe(
      rememberedSessions + 1,
    );
  });
});
