import { expect, it } from 'vitest';
import { operations } from './index';

it('lets an Agent hang up its own Session call at the act tier', () => {
  expect(operations['voice.hangUp'].tier).toBe('act');
  expect(operations['voice.hangUp'].params.safeParse({}).success).toBe(true);
});
